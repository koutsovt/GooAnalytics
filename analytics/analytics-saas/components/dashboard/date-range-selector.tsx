"use client";

import { useState } from "react";
import { ChevronDown, Calendar } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeSelectorProps {
  onRangeChange: (range: DateRange) => void;
  defaultRange?: DateRange;
}

const presets = [
  { label: "Today", days: 0 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

export function DateRangeSelector({
  onRangeChange,
  defaultRange,
}: DateRangeSelectorProps) {
  const today = endOfDay(new Date());
  const thirtyDaysAgo = startOfDay(subDays(today, 30));

  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(
    defaultRange || { from: thirtyDaysAgo, to: today }
  );

  const handlePresetClick = (days: number) => {
    const to = endOfDay(new Date());
    const from = days === 0 ? startOfDay(new Date()) : startOfDay(subDays(to, days));
    const newRange = { from, to };
    setDateRange(newRange);
    onRangeChange(newRange);
    setIsOpen(false);
  };

  const displayText =
    dateRange.from.toDateString() === dateRange.to.toDateString()
      ? format(dateRange.from, "MMM d, yyyy")
      : `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-color-border bg-color-card hover:bg-color-muted text-sm font-medium text-color-foreground transition-colors"
      >
        <Calendar className="h-4 w-4" strokeWidth={1.5} />
        <span>{displayText}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-color-card border border-color-border rounded-lg shadow-lg z-50 min-w-max">
          <div className="p-3 border-b border-color-border">
            <p className="text-xs font-semibold text-color-muted-foreground uppercase">
              Quick Select
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset.days)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    dateRange.to.toDateString() ===
                    endOfDay(new Date()).toDateString() &&
                    dateRange.from.toDateString() ===
                      (preset.days === 0
                        ? startOfDay(new Date()).toDateString()
                        : startOfDay(subDays(endOfDay(new Date()), preset.days)).toDateString())
                      ? "bg-color-brand text-white"
                      : "bg-color-muted text-color-foreground hover:bg-color-brand/20"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3">
            <p className="text-xs font-semibold text-color-muted-foreground uppercase mb-2">
              Selected
            </p>
            <div className="flex items-center gap-2 text-sm text-color-foreground">
              <span>{format(dateRange.from, "MMM d, yyyy")}</span>
              <span className="text-color-muted-foreground">→</span>
              <span>{format(dateRange.to, "MMM d, yyyy")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
