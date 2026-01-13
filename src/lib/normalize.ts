export function normalizeHeader(header: string): string {
  return header.trim();
}

export function normalizeStringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function toNumberLoose(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = normalizeStringValue(value);
  if (!text) return null;

  const cleaned = text
    .replace(/[,\s]/g, "")
    .replace(/^\((.*)\)$/, "-$1")
    .replace(/[^0-9.+-]/g, "");

  if (!cleaned || cleaned === "+" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function normalizeForKey(value: unknown, opts: { caseInsensitive: boolean }): string {
  const base = normalizeStringValue(value);
  return opts.caseInsensitive ? base.toLowerCase() : base;
}
