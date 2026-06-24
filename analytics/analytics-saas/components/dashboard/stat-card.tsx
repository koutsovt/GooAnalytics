"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  unit?: string;
  comparison?: string;
  sparkData?: Array<{ value: number }>;
}

export function StatCard({
  label,
  value,
  delta,
  unit,
  comparison,
  sparkData,
}: StatCardProps) {
  const isDeltaPositive = delta !== undefined && delta >= 0;
  // A single point can't show a trend, so only draw the sparkline with ≥2 points.
  const hasSparkline = sparkData && sparkData.length >= 2;
  // Red/green only mean something when there's a real delta; otherwise stay
  // neutral so a metric without a comparison doesn't falsely imply a decline.
  const sparkColor =
    delta === undefined
      ? "var(--color-brand)"
      : isDeltaPositive
        ? "var(--color-success)"
        : "var(--color-danger)";

  return (
    <div className="rounded-lg border border-border bg-card p-4 md:p-6 hover:border-brand/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>

          <div className="mt-3 flex items-baseline gap-2">
            {delta !== undefined && (
              <span
                className={`inline-flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded ${
                  isDeltaPositive
                    ? "bg-success/10 text-success"
                    : "bg-danger/10 text-danger"
                }`}
              >
                <span>{isDeltaPositive ? "↑" : "↓"}</span>
                <span>{Math.abs(delta)}%</span>
              </span>
            )}
            {comparison && (
              <span className="text-xs text-muted-foreground">
                {comparison}
              </span>
            )}
          </div>

          {unit && (
            <p className="text-xs text-muted-foreground mt-2">{unit}</p>
          )}
        </div>

        {hasSparkline && (
          <div className="w-20 h-12 -mr-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={sparkColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
