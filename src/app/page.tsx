"use client";

import * as React from "react";
import { DatasetInputPanel } from "@/components/DatasetInputPanel";
import { MultiCheckboxSelect } from "@/components/MultiCheckboxSelect";
import { ResultsTable, type ResultItem } from "@/components/ResultsTable";
import { DonutChart } from "@/components/DonutChart";
import { StatCard } from "@/components/StatCard";
import type { ParsedDataset } from "@/lib/datasetTypes";
import { downloadCsv, toCsv, toCsvExpandedMismatches, type ExpandedMismatchRow } from "@/lib/exportCsv";
import { reconcileDatasets } from "@/lib/reconcile";

const SAMPLE_A = `invoice_id,invoice_date,customer,amount
INV-001,2026-01-01,Acme,100.00
INV-002,2026-01-02,Globex,250.00
INV-003,2026-01-03,Initech,75.50
INV-004,2026-01-04,Umbrella,120.00
`;

const SAMPLE_B = `invoice_id,invoice_date,customer,amount
INV-001,2026-01-01,Acme,100
INV-002,2026-01-02,Globex,249.00
INV-003,2026-01-03,Initech,75.50
INV-005,2026-01-05,Wayne,400.00
`;

type TabKey = "overview" | "matches" | "mismatches" | "missing" | "invalid";

function intersect(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

function union(a: string[], b: string[]): string[] {
  const set = new Set<string>();
  for (const x of a) set.add(x);
  for (const x of b) set.add(x);
  return Array.from(set);
}

function filterResultItems(items: ResultItem[], search: string): ResultItem[] {
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
}

export default function Home() {
  const [datasetA, setDatasetA] = React.useState<ParsedDataset | null>(null);
  const [datasetB, setDatasetB] = React.useState<ParsedDataset | null>(null);

  const columnsA = React.useMemo(() => datasetA?.columns ?? [], [datasetA]);
  const columnsB = React.useMemo(() => datasetB?.columns ?? [], [datasetB]);

  const [keyColumns, setKeyColumns] = React.useState<string[]>([]);
  const [compareColumns, setCompareColumns] = React.useState<string[]>([]);

  const [keyCaseInsensitive, setKeyCaseInsensitive] = React.useState(true);
  const [compareCaseInsensitive, setCompareCaseInsensitive] = React.useState(false);
  const [numericTolerance, setNumericTolerance] = React.useState(0);

  const [tab, setTab] = React.useState<TabKey>("overview");
  const [search, setSearch] = React.useState("");

  const commonColumns = React.useMemo(() => intersect(columnsA, columnsB), [columnsA, columnsB]);
  const allColumns = React.useMemo(() => union(columnsA, columnsB).sort(), [columnsA, columnsB]);

  // Best-effort defaults when datasets change.
  React.useEffect(() => {
    if (!datasetA || !datasetB) return;
    if (keyColumns.length === 0) {
      const preferred = ["id", "invoice_id", "transaction_id", "ref", "reference", "doc_no", "document_no"];
      const commonLower = new Map(commonColumns.map((c) => [c.toLowerCase(), c] as const));
      const hit = preferred.find((p) => commonLower.has(p));
      if (hit) setKeyColumns([commonLower.get(hit)!]);
      else if (commonColumns.length > 0) setKeyColumns([commonColumns[0]]);
    }
    if (compareColumns.length === 0) {
      const defaults = commonColumns.filter((c) => !keyColumns.includes(c));
      setCompareColumns(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetA, datasetB]);

  const canReconcile = Boolean(datasetA && datasetB && keyColumns.length > 0 && compareColumns.length > 0);

  const result = React.useMemo(() => {
    if (!canReconcile || !datasetA || !datasetB) return null;
    return reconcileDatasets(datasetA, datasetB, {
      keyColumns,
      compareColumns,
      keyCaseInsensitive,
      compareCaseInsensitive,
      numericTolerance,
    });
  }, [canReconcile, datasetA, datasetB, keyColumns, compareColumns, keyCaseInsensitive, compareCaseInsensitive, numericTolerance]);

  const itemsByTab = React.useMemo(() => {
    if (!result) return { overview: [] as ResultItem[], matches: [], mismatches: [], missing: [], invalid: [] };

    const matches: ResultItem[] = result.paired.exactMatches.map((p) => ({
      id: `m:${p.key}:${p.aIndex}:${p.bIndex}`,
      status: "Match",
      key: p.key,
      aRow: p.aRow,
      bRow: p.bRow,
      note: "All compared fields match",
    }));

    const mismatches: ResultItem[] = result.paired.mismatches.map((p) => ({
      id: `x:${p.key}:${p.aIndex}:${p.bIndex}`,
      status: "Mismatch",
      key: p.key,
      aRow: p.aRow,
      bRow: p.bRow,
      diffs: p.diffs,
      note: `${p.diffs.length} differing field${p.diffs.length === 1 ? "" : "s"}`,
    }));

    const missing: ResultItem[] = [
      ...result.unpaired.missingInA.map((u) => ({
        id: `na:${u.key}:${u.index}`,
        status: "Missing in A" as const,
        key: u.key,
        bRow: u.row,
        note: "Present in B only",
      })),
      ...result.unpaired.missingInB.map((u) => ({
        id: `nb:${u.key}:${u.index}`,
        status: "Missing in B" as const,
        key: u.key,
        aRow: u.row,
        note: "Present in A only",
      })),
    ];

    const invalid: ResultItem[] = [
      ...result.invalid.a.map((x) => ({
        id: `ia:${x.index}`,
        status: "Invalid" as const,
        note: `A row ${x.index + 1}: ${x.reason}`,
        aRow: x.row,
      })),
      ...result.invalid.b.map((x) => ({
        id: `ib:${x.index}`,
        status: "Invalid" as const,
        note: `B row ${x.index + 1}: ${x.reason}`,
        bRow: x.row,
      })),
    ];

    const overview = [...mismatches, ...missing, ...invalid, ...matches];
    return { overview, matches, mismatches, missing, invalid };
  }, [result]);

  const tabCounts = React.useMemo(() => {
    return {
      overview: itemsByTab.overview.length,
      mismatches: itemsByTab.mismatches.length,
      missing: itemsByTab.missing.length,
      matches: itemsByTab.matches.length,
      invalid: itemsByTab.invalid.length,
    };
  }, [itemsByTab]);

  const exportItems = React.useMemo(() => {
    return filterResultItems(itemsByTab[tab], search);
  }, [itemsByTab, tab, search]);

  function onExportCsv() {
    const csv = toCsv(exportItems);
    const date = new Date().toISOString().slice(0, 10);
    const safeTab = tab.replace(/\s+/g, "-").toLowerCase();
    downloadCsv(`reconciliation-${safeTab}-${date}.csv`, csv);
  }

  function onExportExpandedMismatches() {
    if (!result) return;
    const expanded: ExpandedMismatchRow[] = [];
    for (const m of result.paired.mismatches) {
      for (const d of m.diffs) {
        expanded.push({
          key: m.key,
          field: d.field,
          reason: d.reason,
          aValue: d.a,
          bValue: d.b,
          aRowIndex: m.aIndex,
          bRowIndex: m.bIndex,
        });
      }
    }

    const csv = toCsvExpandedMismatches(expanded);
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`reconciliation-mismatches-expanded-${date}.csv`, csv);
  }

  const donutSegments = React.useMemo(() => {
    if (!result) return null;
    return [
      {
        label: "Matches",
        value: result.summary.exactMatches,
        colorClassName: "stroke-emerald-500",
      },
      {
        label: "Mismatches",
        value: result.summary.mismatches,
        colorClassName: "stroke-rose-500",
      },
      {
        label: "Missing",
        value: result.summary.missingInA + result.summary.missingInB,
        colorClassName: "stroke-amber-500",
      },
      {
        label: "Invalid",
        value: result.summary.invalidA + result.summary.invalidB,
        colorClassName: "stroke-zinc-500",
      },
    ];
  }, [result]);

  const readiness = React.useMemo(() => {
    const hasA = Boolean(datasetA);
    const hasB = Boolean(datasetB);
    const hasKey = keyColumns.length > 0;
    const hasCompare = compareColumns.length > 0;
    return {
      hasA,
      hasB,
      hasKey,
      hasCompare,
      ready: hasA && hasB && hasKey && hasCompare,
    };
  }, [datasetA, datasetB, keyColumns.length, compareColumns.length]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10">
      <header className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-200/40 blur-3xl" />

        <div className="relative flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
              Reconciliation dashboard
            </span>
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
              CSV + JSON
            </span>
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
              Explainable diffs
            </span>
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
              Search & drill-down
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Smart Reconciliation Visualizer
          </h1>
          <p className="max-w-3xl text-sm text-zinc-600">
            Compare two financial datasets and instantly see what matches, what’s missing, and exactly why something
            doesn’t reconcile — with filters, search, and raw-row drill-down.
          </p>

          <div className="mt-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Dataset A"
              value={readiness.hasA ? "Loaded" : "Not loaded"}
              sublabel={datasetA ? `${datasetA.rows.length} rows · ${datasetA.columns.length} cols` : "Upload or paste"}
              accentClassName={readiness.hasA ? "bg-emerald-500" : "bg-zinc-300"}
            />
            <StatCard
              label="Dataset B"
              value={readiness.hasB ? "Loaded" : "Not loaded"}
              sublabel={datasetB ? `${datasetB.rows.length} rows · ${datasetB.columns.length} cols` : "Upload or paste"}
              accentClassName={readiness.hasB ? "bg-emerald-500" : "bg-zinc-300"}
            />
            <StatCard
              label="Key columns"
              value={readiness.hasKey ? keyColumns.length : 0}
              sublabel={readiness.hasKey ? keyColumns.join(", ") : "Select at least one"}
              accentClassName={readiness.hasKey ? "bg-indigo-500" : "bg-zinc-300"}
            />
            <StatCard
              label="Compare columns"
              value={readiness.hasCompare ? compareColumns.length : 0}
              sublabel={readiness.hasCompare ? "Configured" : "Select at least one"}
              accentClassName={readiness.hasCompare ? "bg-indigo-500" : "bg-zinc-300"}
            />
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DatasetInputPanel
          title="Dataset A"
          hint="e.g. Purchase register"
          sampleText={SAMPLE_A}
          onDatasetChange={setDatasetA}
        />
        <DatasetInputPanel
          title="Dataset B"
          hint="e.g. Sales register"
          sampleText={SAMPLE_B}
          onDatasetChange={setDatasetB}
        />
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Matching configuration</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Select key columns used to pair rows between datasets, and choose the fields you want to compare for equality.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={keyCaseInsensitive}
                onChange={(e) => setKeyCaseInsensitive(e.target.checked)}
                className="h-4 w-4"
              />
              Key case-insensitive
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={compareCaseInsensitive}
                onChange={(e) => setCompareCaseInsensitive(e.target.checked)}
                className="h-4 w-4"
              />
              Compare case-insensitive
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-800">
              <span className="text-sm">Numeric tolerance</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={numericTolerance}
                onChange={(e) => setNumericTolerance(Number(e.target.value))}
                className="w-28 rounded-md border border-zinc-200 px-2 py-1 text-sm"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <MultiCheckboxSelect
            label="Key columns"
            options={commonColumns}
            selected={keyColumns}
            onChange={setKeyColumns}
            emptyHint="Load both datasets to see common columns."
          />
          <MultiCheckboxSelect
            label="Compare columns"
            options={commonColumns}
            selected={compareColumns}
            onChange={setCompareColumns}
            emptyHint="Load both datasets to see common columns."
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <div className="text-zinc-600">All columns (A ∪ B):</div>
          <div className="flex flex-wrap gap-2">
            {allColumns.slice(0, 16).map((c) => (
              <span key={c} className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700">
                {c}
              </span>
            ))}
            {allColumns.length > 16 ? <span className="text-xs text-zinc-500">+{allColumns.length - 16} more</span> : null}
          </div>
        </div>

        {!canReconcile ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Load both datasets, then select at least 1 key column and 1 compare column to run reconciliation.
          </div>
        ) : null}
      </section>

      <section className="mt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Results</h2>
            <p className="mt-1 text-sm text-zinc-600">Searchable reconciliation output with drill-down row details.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm sm:w-80"
              placeholder="Search (key, fields, values…)"
            />
            <button
              type="button"
              onClick={onExportCsv}
              disabled={exportItems.length === 0}
              className={
                exportItems.length === 0
                  ? "rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-400"
                  : "rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
              }
              title={exportItems.length === 0 ? "Nothing to export" : `Export ${exportItems.length} row(s) to CSV`}
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={onExportExpandedMismatches}
              disabled={!result || result.paired.mismatches.length === 0}
              className={
                !result || result.paired.mismatches.length === 0
                  ? "rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-400"
                  : "rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
              }
              title={
                !result || result.paired.mismatches.length === 0
                  ? "No mismatches to export"
                  : "Export mismatches as one row per differing field"
              }
            >
              Export mismatches (expanded)
            </button>
            <div className="flex gap-2">
              {(
                [
                  ["overview", "Overview"],
                  ["mismatches", "Mismatches"],
                  ["missing", "Missing"],
                  ["matches", "Matches"],
                  ["invalid", "Invalid"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={
                    tab === k
                      ? "rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
                      : "rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    {label}
                    <span
                      className={
                        tab === k
                          ? "rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white"
                          : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700"
                      }
                    >
                      {tabCounts[k]}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {result && donutSegments ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <DonutChart
                title="Reconciliation health"
                subtitle="Distribution across outcomes"
                segments={donutSegments}
                size={150}
                strokeWidth={16}
              />
            </div>
            <div className="lg:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Matched pairs"
                  value={result.summary.matchedPairs}
                  sublabel={`Exact: ${result.summary.exactMatches} · With diffs: ${result.summary.mismatches}`}
                  accentClassName="bg-emerald-500"
                />
                <StatCard
                  label="Missing entries"
                  value={result.summary.missingInA + result.summary.missingInB}
                  sublabel={`Missing in A: ${result.summary.missingInA} · Missing in B: ${result.summary.missingInB}`}
                  accentClassName="bg-amber-500"
                />
                <StatCard
                  label="Invalid rows"
                  value={result.summary.invalidA + result.summary.invalidB}
                  sublabel={`A: ${result.summary.invalidA} · B: ${result.summary.invalidB}`}
                  accentClassName="bg-zinc-500"
                />
                <StatCard
                  label="Duplicate keys"
                  value={result.summary.duplicateKeysA + result.summary.duplicateKeysB}
                  sublabel={`A: ${result.summary.duplicateKeysA} · B: ${result.summary.duplicateKeysB}`}
                  accentClassName="bg-indigo-500"
                />
              </div>

              <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-zinc-600">Configuration snapshot</div>
                <div className="mt-2 grid gap-2 text-sm text-zinc-800 lg:grid-cols-3">
                  <div>
                    <div className="text-xs font-medium text-zinc-500">Key</div>
                    <div className="mt-1 font-mono text-xs">{keyColumns.join(" | ")}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-500">Compare</div>
                    <div className="mt-1 text-xs text-zinc-700">{compareColumns.length} column(s)</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-500">Tolerance</div>
                    <div className="mt-1 text-xs text-zinc-700">± {numericTolerance}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <ResultsTable items={itemsByTab[tab]} search={search} />
        </div>

        {result && (result.diagnostics.duplicateKeysA.length > 0 || result.diagnostics.duplicateKeysB.length > 0) ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-semibold">Duplicates detected</div>
            <div className="mt-1 text-amber-900/90">
              Duplicate keys are paired in input order; extra rows are treated as missing on the other side.
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
