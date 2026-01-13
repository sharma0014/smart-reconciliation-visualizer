import type { DatasetRow } from "./datasetTypes";
import type { FieldDiff } from "./reconcile";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : safeJson(value);
  const needsQuotes = /[\n\r",]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export type ExportResultItem = {
  status: string;
  key?: string;
  note?: string;
  diffs?: FieldDiff[];
  aRow?: DatasetRow;
  bRow?: DatasetRow;
};

export type ExpandedMismatchRow = {
  key: string;
  field: string;
  reason: string;
  aValue: unknown;
  bValue: unknown;
  aRowIndex?: number;
  bRowIndex?: number;
};

export function toCsv(items: ExportResultItem[]): string {
  const header = [
    "status",
    "key",
    "note",
    "diffCount",
    "diffs",
    "aRow",
    "bRow",
  ];

  const lines: string[] = [];
  lines.push(header.join(","));

  for (const it of items) {
    const row = [
      csvEscape(it.status),
      csvEscape(it.key ?? ""),
      csvEscape(it.note ?? ""),
      csvEscape(it.diffs?.length ?? 0),
      csvEscape(it.diffs ?? []),
      csvEscape(it.aRow ?? null),
      csvEscape(it.bRow ?? null),
    ];
    lines.push(row.join(","));
  }

  return lines.join("\n");
}

export function toCsvExpandedMismatches(rows: ExpandedMismatchRow[]): string {
  const header = ["key", "field", "reason", "aValue", "bValue", "aRowIndex", "bRowIndex"];
  const lines: string[] = [];
  lines.push(header.join(","));
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.key),
        csvEscape(r.field),
        csvEscape(r.reason),
        csvEscape(r.aValue),
        csvEscape(r.bValue),
        csvEscape(r.aRowIndex ?? ""),
        csvEscape(r.bRowIndex ?? ""),
      ].join(",")
    );
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // let the click flush before revoking
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
