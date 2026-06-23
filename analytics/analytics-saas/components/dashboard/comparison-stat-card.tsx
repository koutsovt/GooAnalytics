"use client";

interface ComparisonStatCardProps {
  label: string;
  currentValue: number;
  previousValue: number;
  unit?: string;
  currentPeriod?: string;
  previousPeriod?: string;
}

export function ComparisonStatCard({
  label,
  currentValue,
  previousValue,
  unit,
  currentPeriod = "Current",
  previousPeriod = "Previous",
}: ComparisonStatCardProps) {
  const delta = previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
  const isDeltaPositive = delta >= 0;
  const change = currentValue - previousValue;

  return (
    <div className="rounded-lg border border-color-border bg-color-card p-4 md:p-6 hover:border-color-brand/30 transition-colors">
      <p className="text-xs font-medium text-color-muted-foreground uppercase tracking-wide mb-4">
        {label}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Current Period */}
        <div className="border-r border-color-border pr-4">
          <p className="text-xs text-color-muted-foreground mb-1">{currentPeriod}</p>
          <p className="text-2xl font-bold text-color-brand">
            {currentValue >= 1000 ? `${(currentValue / 1000).toFixed(1)}k` : currentValue.toLocaleString()}
          </p>
          {unit && <p className="text-xs text-color-muted-foreground mt-1">{unit}</p>}
        </div>

        {/* Previous Period */}
        <div className="pl-4">
          <p className="text-xs text-color-muted-foreground mb-1">{previousPeriod}</p>
          <p className="text-2xl font-bold text-color-muted-foreground">
            {previousValue >= 1000 ? `${(previousValue / 1000).toFixed(1)}k` : previousValue.toLocaleString()}
          </p>
          {unit && <p className="text-xs text-color-muted-foreground mt-1">{unit}</p>}
        </div>
      </div>

      {/* Delta */}
      <div className="mt-4 pt-4 border-t border-color-border">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded ${
              isDeltaPositive
                ? "bg-color-success/10 text-color-success"
                : "bg-color-danger/10 text-color-danger"
            }`}
          >
            <span>{isDeltaPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(delta).toFixed(1)}%</span>
          </span>
          <span className="text-xs text-color-muted-foreground">
            {isDeltaPositive ? "+" : ""}{change.toLocaleString()} change
          </span>
        </div>
      </div>
    </div>
  );
}
