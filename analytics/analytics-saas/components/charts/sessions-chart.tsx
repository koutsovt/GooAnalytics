"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

interface SessionsChartProps {
  data: Array<{
    period: string;
    sessions: number;
  }>;
  title?: string;
  description?: string;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-card border border-border shadow-lg p-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase">
          {payload[0].name}
        </p>
        <p className="text-lg font-bold text-brand mt-1">
          {payload[0].value?.toLocaleString() ?? 0}
        </p>
      </div>
    );
  }
  return null;
};

export function SessionsChart({
  data,
  title = "Sessions Over Time",
  description,
}: SessionsChartProps) {
  const chartData = data.map((d) => ({
    name: d.period.split("_to_")[0],
    Sessions: d.sessions,
  }));

  const avgSessions =
    chartData.length > 0
      ? Math.round(
          chartData.reduce((sum, d) => sum + (d.Sessions ?? 0), 0) / chartData.length
        )
      : 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 md:p-6 hover:border-brand/30 transition-colors">
      <div className="mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {avgSessions > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Average: <span className="font-semibold text-foreground">{avgSessions.toLocaleString()} sessions</span>
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
            opacity={0.5}
          />
          <XAxis
            dataKey="name"
            stroke="var(--color-muted-foreground)"
            style={{ fontSize: "12px" }}
            tick={{ fill: "var(--color-muted-foreground)" }}
          />
          <YAxis
            stroke="var(--color-muted-foreground)"
            style={{ fontSize: "12px" }}
            tick={{ fill: "var(--color-muted-foreground)" }}
            tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-border)" }} />
          <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }} iconType="line" />
          {avgSessions > 0 && (
            <ReferenceLine
              y={avgSessions}
              stroke="var(--color-muted)"
              strokeDasharray="5 5"
              label={{
                value: "Average",
                position: "right",
                fill: "var(--color-muted-foreground)",
                fontSize: 11,
                offset: 5,
              }}
              opacity={0.5}
            />
          )}
          <Line
            type="monotone"
            dataKey="Sessions"
            stroke="var(--color-brand)"
            strokeWidth={2.5}
            dot={{ fill: "var(--color-brand)", r: 4, strokeWidth: 0 }}
            activeDot={{
              r: 7,
              strokeWidth: 0,
              fill: "var(--color-brand)",
            }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
