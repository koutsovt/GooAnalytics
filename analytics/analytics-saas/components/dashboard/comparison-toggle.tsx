"use client";

import { ToggleLeft, ToggleRight } from "lucide-react";

interface ComparisonToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function ComparisonToggle({ enabled, onChange }: ComparisonToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-2 px-3 py-2 rounded-md border border-color-border bg-color-card hover:bg-color-muted text-sm font-medium text-color-foreground transition-colors"
      title={enabled ? "Disable comparison mode" : "Enable comparison mode"}
    >
      {enabled ? (
        <>
          <ToggleRight className="h-4 w-4 text-color-brand" strokeWidth={1.5} />
          <span>Comparison On</span>
        </>
      ) : (
        <>
          <ToggleLeft className="h-4 w-4 text-color-muted-foreground" strokeWidth={1.5} />
          <span>Compare</span>
        </>
      )}
    </button>
  );
}
