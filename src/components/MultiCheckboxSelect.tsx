"use client";

import * as React from "react";

export function MultiCheckboxSelect(props: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyHint?: string;
}) {
  const { label, options, selected, onChange, emptyHint } = props;

  const set = React.useMemo(() => new Set(selected), [selected]);

  function toggle(value: string) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(Array.from(next));
  }

  if (options.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
        <div className="font-medium text-zinc-900">{label}</div>
        <div className="mt-1">{emptyHint ?? "No columns available yet."}</div>
      </div>
    );
  }

  return (
    <fieldset className="rounded-lg border border-zinc-200 bg-white p-3">
      <legend className="px-1 text-sm font-semibold text-zinc-900">{label}</legend>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={set.has(opt)}
              onChange={() => toggle(opt)}
              className="h-4 w-4"
            />
            <span className="truncate" title={opt}>
              {opt}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-50"
          onClick={() => onChange(options)}
        >
          Select all
        </button>
        <button
          type="button"
          className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-50"
          onClick={() => onChange([])}
        >
          Clear
        </button>
      </div>
    </fieldset>
  );
}
