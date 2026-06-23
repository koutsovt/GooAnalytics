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
  const hasSparkline = sparkData && sparkData.length > 0;

  return (
    <div className="rounded-lg border border-color-border bg-color-card p-4 md:p-6 hover:border-color-brand/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-medium text-color-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-3xl font-bold text-color-foreground mt-2">{value}</p>

          <div className="mt-3 flex items-baseline gap-2">
            {delta !== undefined && (
              <span
                className={`inline-flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded ${
                  isDeltaPositive
                    ? "bg-color-success/10 text-color-success"
                    : "bg-color-danger/10 text-color-danger"
                }`}
              >
                <span>{isDeltaPositive ? "↑" : "↓"}</span>
                <span>{Math.abs(delta)}%</span>
              </span>
            )}
            {comparison && (
              <span className="text-xs text-color-muted-foreground">
                {comparison}
              </span>
            )}
          </div>

          {unit && (
            <p className="text-xs text-color-muted-foreground mt-2">{unit}</p>
          )}
        </div>

        {hasSparkline && (
          <div className="w-20 h-12 -mr-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={isDeltaPositive ? "var(--color-success)" : "var(--color-danger)"}
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
