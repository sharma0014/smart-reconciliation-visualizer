import Papa from "papaparse";
import type { DatasetParseError, DatasetRow, ParsedDataset } from "./datasetTypes";
import { normalizeHeader } from "./normalize";

function uniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((raw) => {
    const base = normalizeHeader(raw);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    if (count === 0) return base;
    return `${base} (${count + 1})`;
  });
}

function objectColumns(rows: DatasetRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) set.add(key);
  }
  return Array.from(set);
}

export type ParseOptions = {
  emptyRows?: "skip" | "keep";
};

export function parseTextToDataset(
  text: string,
  opts: ParseOptions = {}
): { ok: true; dataset: ParsedDataset } | { ok: false; error: DatasetParseError } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: true, dataset: { rows: [], columns: [] } };
  }

  // JSON: array of objects or array of arrays (with header row)
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return { ok: true, dataset: { rows: [], columns: [] } };

        const first = parsed[0];
        if (first && typeof first === "object" && !Array.isArray(first)) {
          const rows = parsed as DatasetRow[];
          return { ok: true, dataset: { rows, columns: objectColumns(rows) } };
        }

        if (Array.isArray(first)) {
          const rows2d = parsed as unknown[][];
          const headerRow = rows2d[0]?.map((h) => String(h ?? "")) ?? [];
          const headers = uniqueHeaders(headerRow);
          const rows: DatasetRow[] = rows2d.slice(1).map((r) => {
            const obj: DatasetRow = {};
            for (let i = 0; i < headers.length; i++) obj[headers[i]] = r?.[i];
            return obj;
          });
          return { ok: true, dataset: { rows, columns: headers } };
        }
      }

      return {
        ok: false,
        error: {
          message: "Unsupported JSON shape. Provide an array of objects or a 2D array (first row headers).",
        },
      };
    } catch (e) {
      return {
        ok: false,
        error: {
          message: "Invalid JSON.",
          details: e instanceof Error ? e.message : String(e),
        },
      };
    }
  }

  // CSV / TSV / delimited text
  const result = Papa.parse<Record<string, unknown>>(trimmed, {
    header: true,
    skipEmptyLines: opts.emptyRows !== "keep",
    dynamicTyping: false,
    transformHeader: (h) => normalizeHeader(h),
  });

  if (result.errors?.length) {
    const firstErr = result.errors[0];
    return {
      ok: false,
      error: {
        message: `CSV parse error: ${firstErr.message}`,
        details: `Row ${firstErr.row ?? "?"}`,
      },
    };
  }

  const rows = (result.data ?? []).filter((r) => r && Object.keys(r).length > 0);
  const columns = uniqueHeaders(result.meta.fields ?? objectColumns(rows));

  // Ensure every row has every column, to make rendering easier
  const normalizedRows: DatasetRow[] = rows.map((r) => {
    const obj: DatasetRow = {};
    for (const col of columns) obj[col] = r[col];
    return obj;
  });

  return { ok: true, dataset: { rows: normalizedRows, columns } };
}

export async function parseFileToDataset(
  file: File
): Promise<{ ok: true; dataset: ParsedDataset } | { ok: false; error: DatasetParseError }> {
  const text = await file.text();
  return parseTextToDataset(text);
}
