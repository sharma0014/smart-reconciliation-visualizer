"use client";

import * as React from "react";

function clamp01(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export type DonutSegment = {
  label: string;
  value: number;
  colorClassName: string;
};

export function DonutChart(props: {
  title: string;
  subtitle?: string;
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
}) {
  const { title, subtitle, segments } = props;
  const size = props.size ?? 140;
  const strokeWidth = props.strokeWidth ?? 16;

  const total = segments.reduce((acc, s) => acc + s.value, 0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalized = segments.map((s) => ({
    ...s,
    frac: total === 0 ? 0 : clamp01(s.value / total),
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-zinc-900">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-zinc-500">Total</div>
          <div className="text-lg font-semibold text-zinc-900">{total}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#e4e4e7"
              strokeWidth={strokeWidth}
            />
            {normalized.map((s, idx) => {
              const dash = s.frac * circumference;
              const dashArray = `${dash} ${circumference - dash}`;
              const dashOffset = -normalized
                .slice(0, idx)
                .reduce((sum, prev) => sum + prev.frac * circumference, 0);

              return (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  className={s.colorClassName}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                />
              );
            })}
          </g>
          <circle cx={size / 2} cy={size / 2} r={radius - strokeWidth / 2} fill="white" />
          <text x="50%" y="48%" textAnchor="middle" className="fill-zinc-900" fontSize="18" fontWeight="600">
            {total}
          </text>
          <text x="50%" y="61%" textAnchor="middle" className="fill-zinc-500" fontSize="11">
            records
          </text>
        </svg>

        <div className="min-w-0 flex-1">
          <div className="space-y-2">
            {segments.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full ${s.colorClassName}`} />
                  <span className="truncate text-sm text-zinc-700" title={s.label}>
                    {s.label}
                  </span>
                </div>
                <span className="text-sm font-medium text-zinc-900">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
