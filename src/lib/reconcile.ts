import type { DatasetRow, ParsedDataset } from "./datasetTypes";
import { normalizeForKey, normalizeStringValue, toNumberLoose } from "./normalize";

export type FieldDiff = {
  field: string;
  a: unknown;
  b: unknown;
  reason: "different" | "numeric-outside-tolerance";
};

export type PairedRow = {
  key: string;
  aIndex: number;
  bIndex: number;
  aRow: DatasetRow;
  bRow: DatasetRow;
};

export type UnpairedRow = {
  key: string;
  side: "A" | "B";
  index: number;
  row: DatasetRow;
};

export type InvalidRow = {
  side: "A" | "B";
  index: number;
  row: DatasetRow;
  reason: string;
};

export type ReconciliationResult = {
  summary: {
    rowsA: number;
    rowsB: number;
    keysA: number;
    keysB: number;
    matchedPairs: number;
    exactMatches: number;
    mismatches: number;
    missingInA: number;
    missingInB: number;
    invalidA: number;
    invalidB: number;
    duplicateKeysA: number;
    duplicateKeysB: number;
  };
  options: ReconcileOptions;
  paired: {
    exactMatches: PairedRow[];
    mismatches: Array<PairedRow & { diffs: FieldDiff[] }>;
  };
  unpaired: {
    missingInA: UnpairedRow[];
    missingInB: UnpairedRow[];
  };
  invalid: {
    a: InvalidRow[];
    b: InvalidRow[];
  };
  diagnostics: {
    duplicateKeysA: Array<{ key: string; count: number }>;
    duplicateKeysB: Array<{ key: string; count: number }>;
  };
};

export type ReconcileOptions = {
  keyColumns: string[];
  compareColumns: string[];
  keyCaseInsensitive?: boolean;
  compareCaseInsensitive?: boolean;
  numericTolerance?: number;
};

function buildKey(row: DatasetRow, keyColumns: string[], caseInsensitive: boolean): string | null {
  if (keyColumns.length === 0) return null;
  const parts: string[] = [];
  for (const col of keyColumns) {
    const normalized = normalizeForKey(row[col], { caseInsensitive });
    if (!normalized) return null;
    parts.push(normalized);
  }
  return parts.join("|");
}

function indexByKey(
  rows: DatasetRow[],
  keyColumns: string[],
  caseInsensitive: boolean,
  side: "A" | "B"
): { map: Map<string, number[]>; invalid: InvalidRow[]; duplicates: Array<{ key: string; count: number }> } {
  const map = new Map<string, number[]>();
  const invalid: InvalidRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const key = buildKey(row, keyColumns, caseInsensitive);
    if (!key) {
      invalid.push({
        side,
        index: i,
        row,
        reason: "Missing one or more key fields",
      });
      continue;
    }

    const arr = map.get(key);
    if (arr) arr.push(i);
    else map.set(key, [i]);
  }

  const duplicates: Array<{ key: string; count: number }> = [];
  for (const [key, idxs] of map.entries()) {
    if (idxs.length > 1) duplicates.push({ key, count: idxs.length });
  }

  return { map, invalid, duplicates };
}

function diffRows(
  aRow: DatasetRow,
  bRow: DatasetRow,
  compareColumns: string[],
  compareCaseInsensitive: boolean,
  numericTolerance: number
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  for (const field of compareColumns) {
    const aVal = aRow[field];
    const bVal = bRow[field];

    const aNum = toNumberLoose(aVal);
    const bNum = toNumberLoose(bVal);

    if (aNum !== null && bNum !== null) {
      if (Math.abs(aNum - bNum) > numericTolerance) {
        diffs.push({ field, a: aVal, b: bVal, reason: "numeric-outside-tolerance" });
      }
      continue;
    }

    const aStr = normalizeStringValue(aVal);
    const bStr = normalizeStringValue(bVal);

    const aa = compareCaseInsensitive ? aStr.toLowerCase() : aStr;
    const bb = compareCaseInsensitive ? bStr.toLowerCase() : bStr;

    if (aa !== bb) {
      diffs.push({ field, a: aVal, b: bVal, reason: "different" });
    }
  }

  return diffs;
}

function unionKeys(a: Map<string, number[]>, b: Map<string, number[]>): string[] {
  const keys = new Set<string>();
  for (const k of a.keys()) keys.add(k);
  for (const k of b.keys()) keys.add(k);
  return Array.from(keys);
}

export function reconcileDatasets(datasetA: ParsedDataset, datasetB: ParsedDataset, options: ReconcileOptions): ReconciliationResult {
  const keyCaseInsensitive = options.keyCaseInsensitive ?? true;
  const compareCaseInsensitive = options.compareCaseInsensitive ?? false;
  const numericTolerance = options.numericTolerance ?? 0;

  const { map: mapA, invalid: invalidA, duplicates: dupA } = indexByKey(
    datasetA.rows,
    options.keyColumns,
    keyCaseInsensitive,
    "A"
  );
  const { map: mapB, invalid: invalidB, duplicates: dupB } = indexByKey(
    datasetB.rows,
    options.keyColumns,
    keyCaseInsensitive,
    "B"
  );

  const exactMatches: PairedRow[] = [];
  const mismatches: Array<PairedRow & { diffs: FieldDiff[] }> = [];
  const missingInA: UnpairedRow[] = [];
  const missingInB: UnpairedRow[] = [];

  const keys = unionKeys(mapA, mapB).sort();

  for (const key of keys) {
    const aIdxs = mapA.get(key) ?? [];
    const bIdxs = mapB.get(key) ?? [];

    const pairs = Math.min(aIdxs.length, bIdxs.length);
    for (let p = 0; p < pairs; p++) {
      const aIndex = aIdxs[p];
      const bIndex = bIdxs[p];
      const aRow = datasetA.rows[aIndex];
      const bRow = datasetB.rows[bIndex];

      const diffs = diffRows(aRow, bRow, options.compareColumns, compareCaseInsensitive, numericTolerance);

      const paired: PairedRow = { key, aIndex, bIndex, aRow, bRow };
      if (diffs.length === 0) exactMatches.push(paired);
      else mismatches.push({ ...paired, diffs });
    }

    for (let i = pairs; i < aIdxs.length; i++) {
      const index = aIdxs[i];
      missingInB.push({ key, side: "A", index, row: datasetA.rows[index] });
    }

    for (let i = pairs; i < bIdxs.length; i++) {
      const index = bIdxs[i];
      missingInA.push({ key, side: "B", index, row: datasetB.rows[index] });
    }
  }

  return {
    summary: {
      rowsA: datasetA.rows.length,
      rowsB: datasetB.rows.length,
      keysA: mapA.size,
      keysB: mapB.size,
      matchedPairs: exactMatches.length + mismatches.length,
      exactMatches: exactMatches.length,
      mismatches: mismatches.length,
      missingInA: missingInA.length,
      missingInB: missingInB.length,
      invalidA: invalidA.length,
      invalidB: invalidB.length,
      duplicateKeysA: dupA.length,
      duplicateKeysB: dupB.length,
    },
    options: {
      ...options,
      keyCaseInsensitive,
      compareCaseInsensitive,
      numericTolerance,
    },
    paired: { exactMatches, mismatches },
    unpaired: { missingInA, missingInB },
    invalid: { a: invalidA, b: invalidB },
    diagnostics: {
      duplicateKeysA: dupA,
      duplicateKeysB: dupB,
    },
  };
}
