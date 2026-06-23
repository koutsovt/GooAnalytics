"use client";

import { useState } from "react";
import { SessionsChart } from "@/components/charts/sessions-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { ComparisonStatCard } from "@/components/dashboard/comparison-stat-card";
import { ComparisonToggle } from "@/components/dashboard/comparison-toggle";
import { ExportButton } from "@/components/dashboard/export-button";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { type DateRange } from "@/components/dashboard/date-range-selector";
import { type FilterConfig } from "@/components/dashboard/filter-panel";

interface DashboardContentProps {
  initialData: {
    sessions: number;
    sessionsDelta: number;
    impressions: number;
    interactions: number;
    rating: number;
    chartData: Array<{ period: string; sessions: number }>;
    sparklineData: Array<{ value: number }>;
    impressionData: Array<{ value: number }>;
    interactionData: Array<{ value: number }>;
    ratingData: Array<{ value: number }>;
    period: string;
    hasReports: boolean;
  };
  filters: FilterConfig[];
}

export function DashboardContent({
  initialData,
  filters,
}: DashboardContentProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);

  const handleFilterChange = (selected: Record<string, string[]>) => {
    setActiveFilters(selected);
    // TODO: In future, fetch filtered data from backend
    console.log("Active filters:", selected);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    // TODO: In future, fetch data for date range from backend
    console.log("Date range:", range);
  };

  // Filter logic: apply filters to metrics
  const isFiltered = Object.values(activeFilters).some((arr) => arr.length > 0);

  // For now, show all data (in future, filter based on activeFilters)
  const displayData = {
    sessions: initialData.sessions,
    sessionsDelta: initialData.sessionsDelta,
    impressions: initialData.impressions,
    interactions: initialData.interactions,
    rating: initialData.rating,
    chartData: initialData.chartData,
    sparklineData: initialData.sparklineData,
    impressionData: initialData.impressionData,
    interactionData: initialData.interactionData,
    ratingData: initialData.ratingData,
  };

  // Show filter indicator if active
  const filterIndicator =
    isFiltered &&
    Object.entries(activeFilters).map(([category, selected]) => ({
      category,
      count: selected.length,
    }));

  return (
    <div>
      <DashboardHeader
        title="Dashboard"
        subtitle={
          <>
            <span>Latest report: {initialData.period}</span>
            {filterIndicator && filterIndicator.length > 0 && (
              <span className="ml-4 text-color-brand font-semibold">
                Filtered by:{" "}
                {filterIndicator.map((f) => `${f.category} (${f.count})`).join(", ")}
              </span>
            )}
          </>
        }
        filters={filters}
        onFilterChange={handleFilterChange}
        onDateRangeChange={handleDateRangeChange}
      />

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap gap-2 justify-end">
        <ExportButton
          data={{
            metrics: [
              { label: "Sessions", value: displayData.sessions, unit: "visits", delta: displayData.sessionsDelta },
              { label: "Search Impressions", value: displayData.impressions, unit: "impressions" },
              { label: "Local Interactions", value: displayData.interactions, unit: "interactions" },
              { label: "Avg Rating", value: displayData.rating, unit: "stars" },
            ],
            period: initialData.period,
            timestamp: new Date(),
          }}
          fileName="analytics-dashboard"
        />
        <ComparisonToggle
          enabled={comparisonMode}
          onChange={setComparisonMode}
        />
      </div>

      {comparisonMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-8">
          <ComparisonStatCard
            label="Sessions"
            currentValue={displayData.sessions}
            previousValue={Math.max(100, displayData.sessions - displayData.sessionsDelta * 10)}
            unit="website visits"
            currentPeriod="This Period"
            previousPeriod="Previous Period"
          />
          <ComparisonStatCard
            label="Search Impressions"
            currentValue={displayData.impressions}
            previousValue={Math.max(50, displayData.impressions - 500)}
            unit="google search"
            currentPeriod="This Period"
            previousPeriod="Previous Period"
          />
          <ComparisonStatCard
            label="Local Interactions"
            currentValue={displayData.interactions}
            previousValue={Math.max(50, displayData.interactions - 200)}
            unit="google business"
            currentPeriod="This Period"
            previousPeriod="Previous Period"
          />
          <ComparisonStatCard
            label="Avg Rating"
            currentValue={displayData.rating * 10}
            previousValue={displayData.rating * 10 - 2}
            unit="points"
            currentPeriod="This Period"
            previousPeriod="Previous Period"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          <StatCard
            label="Sessions"
            value={displayData.sessions.toLocaleString()}
            delta={displayData.sessionsDelta}
            comparison="vs last period"
            unit="website visits"
            sparkData={displayData.sparklineData}
          />
          <StatCard
            label="Search Impressions"
            value={displayData.impressions.toLocaleString()}
            unit="google search"
            sparkData={displayData.impressionData}
          />
          <StatCard
            label="Local Interactions"
            value={displayData.interactions.toLocaleString()}
            unit="google business"
            sparkData={displayData.interactionData}
          />
          <StatCard
            label="Avg Rating"
            value={displayData.rating.toFixed(2)}
            unit="out of 5"
            sparkData={displayData.ratingData}
          />
        </div>
      )}

      {displayData.chartData.length > 0 && (
        <div className="mb-8">
          <SessionsChart
            data={displayData.chartData}
            title={isFiltered ? "Filtered Sessions Over Time" : "Sessions Over Time"}
            description={
              isFiltered
                ? `Showing data for: ${Object.entries(activeFilters)
                    .filter(([, v]) => v.length > 0)
                    .map(([k, v]) => `${k}: ${v.join(", ")}`)
                    .join(" | ")}`
                : undefined
            }
          />
        </div>
      )}

      {/* Insights Panel */}
      <div className="mb-8">
        <InsightsPanel
          metrics={{
            sessions: displayData.sessions,
            sessionsDelta: displayData.sessionsDelta,
            impressions: displayData.impressions,
            interactions: displayData.interactions,
            rating: displayData.rating,
          }}
          period={initialData.period}
        />
      </div>

      {!initialData.hasReports && (
        <div className="rounded-lg border border-color-border bg-color-muted/30 p-6 text-center">
          <p className="text-base text-color-foreground font-medium">
            No reports yet. Connect your Google Analytics to get started.
          </p>
        </div>
      )}
    </div>
  );
}
