"use client";

import { ReactNode, useState } from "react";
import { DateRangeSelector, type DateRange } from "./date-range-selector";
import { FilterPanel, type FilterConfig } from "./filter-panel";
import { endOfDay, startOfDay, subDays } from "date-fns";

interface DashboardHeaderProps {
  title: string;
  subtitle?: ReactNode;
  onDateRangeChange?: (range: DateRange) => void;
  showDatePicker?: boolean;
  filters?: FilterConfig[];
  onFilterChange?: (selected: Record<string, string[]>) => void;
}

export function DashboardHeader({
  title,
  subtitle,
  onDateRangeChange,
  showDatePicker = true,
  filters,
  onFilterChange,
}: DashboardHeaderProps) {
  const today = endOfDay(new Date());
  const thirtyDaysAgo = startOfDay(subDays(today, 30));

  const handleRangeChange = (range: DateRange) => {
    onDateRangeChange?.(range);
  };

  return (
    <div className="mb-6 md:mb-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-0 mb-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-color-foreground">{title}</h1>
          {subtitle && (
            <p className="text-color-muted-foreground text-xs md:text-sm mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filters && filters.length > 0 && (
            <FilterPanel filters={filters} onFilterChange={onFilterChange} />
          )}
          {showDatePicker && (
            <DateRangeSelector
              onRangeChange={handleRangeChange}
              defaultRange={{ from: thirtyDaysAgo, to: today }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
