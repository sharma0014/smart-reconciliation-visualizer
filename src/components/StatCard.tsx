"use client";

import * as React from "react";

export function StatCard(props: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  icon?: React.ReactNode;
  accentClassName?: string;
}) {
  const { label, value, sublabel, icon, accentClassName } = props;

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${accentClassName ?? "bg-zinc-900"}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-zinc-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-900">{value}</div>
          {sublabel ? <div className="mt-1 text-xs text-zinc-500">{sublabel}</div> : null}
        </div>
        {icon ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">{icon}</div>
        ) : null}
      </div>
    </div>
  );
}
