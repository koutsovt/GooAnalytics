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

interface MetricChartProps {
  data: Array<{ [key: string]: string | number }>;
  metricKey: string;
  metricLabel?: string;
  title: string;
  description?: string;
  height?: number;
  color?: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-color-card border border-color-border shadow-lg p-3">
        <p className="text-xs font-semibold text-color-muted-foreground uppercase">
          {label}
        </p>
        <p className="text-lg font-bold text-color-brand mt-1">
          {typeof payload[0].value === "number"
            ? payload[0].value >= 1000
              ? `${(payload[0].value / 1000).toFixed(1)}k`
              : payload[0].value.toLocaleString()
            : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function MetricChart({
  data,
  metricKey,
  metricLabel,
  title,
  description,
  height = 320,
  color = "var(--color-brand)",
}: MetricChartProps) {
  const chartData = data.map((d) => ({
    name: String(d.period ?? d.name ?? ""),
    [metricLabel || metricKey]: d[metricKey],
  }));

  const values = chartData
    .map((d) => d[metricLabel || metricKey])
    .filter((v) => typeof v === "number");
  const average =
    values.length > 0 ? Math.round(values.reduce((a, b) => a + (b as number), 0) / values.length) : 0;
  const max = values.length > 0 ? Math.max(...(values as number[])) : 0;

  return (
    <div className="rounded-lg border border-color-border bg-color-card p-6 hover:border-color-brand/30 transition-colors">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-color-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-color-muted-foreground mt-1">{description}</p>
        )}
        <div className="flex gap-6 mt-3">
          {average > 0 && (
            <div>
              <p className="text-xs text-color-muted-foreground">Average</p>
              <p className="text-sm font-semibold text-color-foreground">
                {average >= 1000 ? `${(average / 1000).toFixed(1)}k` : average.toLocaleString()}
              </p>
            </div>
          )}
          {max > 0 && (
            <div>
              <p className="text-xs text-color-muted-foreground">Peak</p>
              <p className="text-sm font-semibold text-color-foreground">
                {max >= 1000 ? `${(max / 1000).toFixed(1)}k` : max.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
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
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "var(--color-border)" }}
            wrapperStyle={{ outline: "none" }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            contentStyle={{
              color: "var(--color-foreground)",
              fontSize: "12px",
              border: "none",
            }}
            iconType="line"
          />
          {average > 0 && (
            <ReferenceLine
              y={average}
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
            dataKey={metricLabel || metricKey}
            stroke={color}
            strokeWidth={2.5}
            dot={{ fill: color, r: 4, strokeWidth: 0 }}
            activeDot={{
              r: 7,
              strokeWidth: 0,
              fill: color,
            }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
