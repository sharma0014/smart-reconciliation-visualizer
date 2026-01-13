"use client";

import * as React from "react";
import type { DatasetParseError, ParsedDataset } from "@/lib/datasetTypes";
import { parseFileToDataset, parseTextToDataset } from "@/lib/parseDataset";

type PanelState =
  | { status: "empty" }
  | { status: "ok"; dataset: ParsedDataset }
  | { status: "error"; error: DatasetParseError };

export function DatasetInputPanel(props: {
  title: string;
  hint: string;
  sampleText: string;
  onDatasetChange: (dataset: ParsedDataset | null) => void;
}) {
  const { title, hint, sampleText, onDatasetChange } = props;

  const [text, setText] = React.useState<string>("");
  const [state, setState] = React.useState<PanelState>({ status: "empty" });
  const [dragActive, setDragActive] = React.useState(false);

  async function onFile(file: File | null) {
    if (!file) return;
    const parsed = await parseFileToDataset(file);
    if (parsed.ok) {
      setState({ status: "ok", dataset: parsed.dataset });
      onDatasetChange(parsed.dataset);
    } else {
      setState({ status: "error", error: parsed.error });
      onDatasetChange(null);
    }
  }

  async function onDropFiles(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    await onFile(file);
  }

  function onParseText() {
    const parsed = parseTextToDataset(text);
    if (parsed.ok) {
      setState({ status: "ok", dataset: parsed.dataset });
      onDatasetChange(parsed.dataset);
    } else {
      setState({ status: "error", error: parsed.error });
      onDatasetChange(null);
    }
  }

  function onLoadSample() {
    setText(sampleText);
    const parsed = parseTextToDataset(sampleText);
    if (parsed.ok) {
      setState({ status: "ok", dataset: parsed.dataset });
      onDatasetChange(parsed.dataset);
    } else {
      setState({ status: "error", error: parsed.error });
      onDatasetChange(null);
    }
  }

  function onClear() {
    setText("");
    setState({ status: "empty" });
    onDatasetChange(null);
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600">{hint}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
            onClick={onLoadSample}
          >
            Load sample
          </button>
          <button
            type="button"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
            onClick={onClear}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div
          className={
            dragActive
              ? "rounded-lg border-2 border-dashed border-zinc-900 bg-zinc-50 p-3"
              : "rounded-lg border border-zinc-200 p-3"
          }
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => void onDropFiles(e)}
        >
          <div className="text-sm font-medium text-zinc-900">Upload file</div>
          <div className="mt-1 text-xs text-zinc-600">Drag & drop or choose a CSV/JSON file</div>
          <input
            type="file"
            accept=".csv,.tsv,.txt,.json,text/csv,application/json"
            className="mt-3 block w-full text-sm"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
          <div className="mt-2 text-xs text-zinc-500">Tip: headers matter — choose the columns you’ll match on.</div>
        </div>

        <div className="rounded-lg border border-zinc-200 p-3">
          <div className="text-sm font-medium text-zinc-900">Paste data</div>
          <div className="mt-1 text-xs text-zinc-600">CSV with headers, or JSON array</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-3 h-28 w-full rounded-md border border-zinc-200 bg-white p-2 font-mono text-xs text-zinc-900"
            placeholder="id,date,amount\n1,2026-01-01,100\n..."
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
              onClick={onParseText}
            >
              Parse
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {state.status === "empty" && (
          <div className="text-sm text-zinc-600">No data loaded yet.</div>
        )}
        {state.status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="font-medium">{state.error.message}</div>
            {state.error.details ? <div className="mt-1 text-xs">{state.error.details}</div> : null}
          </div>
        )}
        {state.status === "ok" && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">Parsed successfully</div>
              <div className="text-xs text-emerald-900/80">
                Rows: {state.dataset.rows.length} · Columns: {state.dataset.columns.length}
              </div>
            </div>
            {state.dataset.columns.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {state.dataset.columns.slice(0, 10).map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs text-emerald-900"
                    title={c}
                  >
                    {c}
                  </span>
                ))}
                {state.dataset.columns.length > 10 ? (
                  <span className="text-xs text-emerald-900/80">+{state.dataset.columns.length - 10} more</span>
                ) : null}
              </div>
            ) : null}

            {state.dataset.rows.length > 0 ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-emerald-900/80 hover:text-emerald-950">
                  Preview first rows
                </summary>
                <div className="mt-2 overflow-hidden rounded-lg border border-emerald-200 bg-white">
                  <table className="w-full table-fixed">
                    <thead className="bg-emerald-50">
                      <tr>
                        {state.dataset.columns.slice(0, 4).map((c) => (
                          <th key={c} className="px-3 py-2 text-left text-xs font-semibold text-emerald-900/80">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100">
                      {state.dataset.rows.slice(0, 4).map((r, idx) => (
                        <tr key={idx}>
                          {state.dataset.columns.slice(0, 4).map((c) => (
                            <td key={c} className="px-3 py-2 text-xs text-zinc-800 truncate" title={String(r[c] ?? "")}>
                              {String(r[c] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
