"use client";

import * as React from "react";
import type { DatasetRow } from "@/lib/datasetTypes";
import type { FieldDiff } from "@/lib/reconcile";
import { normalizeStringValue } from "@/lib/normalize";

export type ResultItem = {
  id: string;
  status: "Match" | "Mismatch" | "Missing in A" | "Missing in B" | "Invalid";
  key?: string;
  diffs?: FieldDiff[];
  aRow?: DatasetRow;
  bRow?: DatasetRow;
  note?: string;
};

function statusBadge(status: ResultItem["status"]): { className: string; dotClassName: string } {
  switch (status) {
    case "Match":
      return { className: "bg-emerald-50 text-emerald-800 border-emerald-200", dotClassName: "bg-emerald-500" };
    case "Mismatch":
      return { className: "bg-rose-50 text-rose-800 border-rose-200", dotClassName: "bg-rose-500" };
    case "Missing in A":
      return { className: "bg-amber-50 text-amber-900 border-amber-200", dotClassName: "bg-amber-500" };
    case "Missing in B":
      return { className: "bg-amber-50 text-amber-900 border-amber-200", dotClassName: "bg-amber-500" };
    case "Invalid":
      return { className: "bg-zinc-100 text-zinc-800 border-zinc-200", dotClassName: "bg-zinc-500" };
  }
}

function diffSummary(diffs: FieldDiff[] | undefined): string {
  if (!diffs || diffs.length === 0) return "";
  return diffs
    .slice(0, 3)
    .map((d) => `${d.field}: ${normalizeStringValue(d.a)} → ${normalizeStringValue(d.b)}`)
    .join(" · ");
}

export function ResultsTable(props: { items: ResultItem[]; search: string }) {
  const { items, search } = props;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((it) => {
      const hay = [
        it.status,
        it.key ?? "",
        it.note ?? "",
        it.diffs ? JSON.stringify(it.diffs) : "",
        it.aRow ? JSON.stringify(it.aRow) : "",
        it.bRow ? JSON.stringify(it.bRow) : "",
      ]
        .join("\n")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
        <div className="text-sm font-semibold text-zinc-900">No results</div>
        <div className="mt-1 text-sm text-zinc-600">Try changing tabs or refining your search.</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full table-fixed">
          <thead className="sticky top-0 z-10 bg-zinc-50">
          <tr>
            <th className="w-40 px-4 py-3 text-left text-xs font-semibold text-zinc-600">Status</th>
            <th className="w-72 px-4 py-3 text-left text-xs font-semibold text-zinc-600">Key</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Details</th>
          </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((it, idx) => {
              const badge = statusBadge(it.status);
              return (
                <tr key={it.id} className={idx % 2 === 0 ? "align-top" : "align-top bg-zinc-50/40"}>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${badge.dotClassName}`} />
                      {it.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-800">
                    {it.key ? (
                      <span className="rounded-md bg-zinc-100 px-2 py-1">{it.key}</span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-800">
                    {it.note ? <div className="text-zinc-800">{it.note}</div> : null}
                    {it.diffs && it.diffs.length > 0 ? (
                      <div className="mt-1 text-sm text-zinc-700">
                        <div className="text-xs font-semibold text-zinc-600">Diff summary</div>
                        <div className="mt-1">{diffSummary(it.diffs)}</div>
                        {it.diffs.length > 3 ? (
                          <div className="mt-1 text-xs text-zinc-500">+{it.diffs.length - 3} more field(s)</div>
                        ) : null}
                      </div>
                    ) : null}

                    {(it.aRow || it.bRow) && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-900">
                          View raw rows
                        </summary>
                        <div className="mt-2 grid gap-2 lg:grid-cols-2">
                          <div className="rounded-lg border border-zinc-200 bg-zinc-50">
                            <div className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600">Dataset A</div>
                            <pre className="overflow-auto p-3 text-xs">{it.aRow ? JSON.stringify(it.aRow, null, 2) : "(no A row)"}</pre>
                          </div>
                          <div className="rounded-lg border border-zinc-200 bg-zinc-50">
                            <div className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600">Dataset B</div>
                            <pre className="overflow-auto p-3 text-xs">{it.bRow ? JSON.stringify(it.bRow, null, 2) : "(no B row)"}</pre>
                          </div>
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
