"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

export interface FilterConfig {
  category: string;
  label: string;
  options: Array<{
    id: string;
    label: string;
    count?: number;
  }>;
}

interface FilterPanelProps {
  filters: FilterConfig[];
  onFilterChange?: (selected: Record<string, string[]>) => void;
}

export function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(filters.map((f) => f.category))
  );
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleToggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleToggleFilter = (category: string, optionId: string) => {
    setSelectedFilters((prev) => {
      const current = prev[category] || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [category]: updated };
    });
  };

  const handleApplyFilters = () => {
    onFilterChange?.(selectedFilters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    setSelectedFilters({});
    onFilterChange?.({});
    setIsOpen(false);
  };

  const activeFilterCount = Object.values(selectedFilters).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-color-border bg-color-card hover:bg-color-muted text-sm font-medium text-color-foreground transition-colors"
      >
        <span>🔍 Filters</span>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-color-brand text-xs font-bold text-white">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-color-card border border-color-border rounded-lg shadow-lg z-50 w-80 max-h-96 overflow-y-auto">
          <div className="sticky top-0 bg-color-card border-b border-color-border p-4">
            <h3 className="text-sm font-semibold text-color-foreground">Filter Results</h3>
          </div>

          <div className="p-4 space-y-4">
            {filters.map((filterConfig) => (
              <div key={filterConfig.category} className="border-b border-color-border last:border-0 pb-4 last:pb-0">
                <button
                  onClick={() => handleToggleCategory(filterConfig.category)}
                  className="flex items-center justify-between w-full mb-2 hover:text-color-brand transition-colors"
                >
                  <span className="text-xs font-semibold text-color-muted-foreground uppercase">
                    {filterConfig.label}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-color-muted-foreground transition-transform ${
                      expandedCategories.has(filterConfig.category) ? "rotate-180" : ""
                    }`}
                    strokeWidth={1.5}
                  />
                </button>

                {expandedCategories.has(filterConfig.category) && (
                  <div className="space-y-2 mt-2">
                    {filterConfig.options.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-color-muted p-2 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={
                            selectedFilters[filterConfig.category]?.includes(option.id) ?? false
                          }
                          onChange={() =>
                            handleToggleFilter(filterConfig.category, option.id)
                          }
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-sm text-color-foreground flex-1">
                          {option.label}
                        </span>
                        {option.count !== undefined && (
                          <span className="text-xs text-color-muted-foreground">
                            {option.count}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="sticky bottom-0 bg-color-card border-t border-color-border p-4 flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="flex-1 px-3 py-2 rounded-md bg-color-brand text-white text-sm font-medium hover:bg-color-brand-dark transition-colors"
            >
              Apply
            </button>
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 rounded-md border border-color-border text-color-foreground text-sm font-medium hover:bg-color-muted transition-colors"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
