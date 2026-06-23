"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface ExportData {
  metrics: Array<{
    label: string;
    value: number;
    unit?: string;
    delta?: number;
  }>;
  period: string;
  timestamp: Date;
}

interface ExportButtonProps {
  data: ExportData;
  fileName?: string;
}

export function ExportButton({ data, fileName = "dashboard-export" }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [isOpen, setIsOpen] = useState(false);

  const exportToCSV = () => {
    setIsExporting(true);

    try {
      const headers = ["Metric", "Value", "Unit", "Delta %"];
      const rows = data.metrics.map((m) => [
        m.label,
        m.value.toString(),
        m.unit || "",
        m.delta?.toString() || "",
      ]);

      const csv = [
        `Dashboard Export - ${data.period}`,
        `Exported: ${new Date().toISOString()}`,
        "",
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const exportToJSON = () => {
    setIsExporting(true);

    try {
      const json = JSON.stringify(
        {
          period: data.period,
          exportedAt: new Date().toISOString(),
          metrics: data.metrics,
        },
        null,
        2
      );

      const blob = new Blob([json], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-color-border bg-color-card hover:bg-color-muted text-sm font-medium text-color-foreground transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" strokeWidth={1.5} />
        )}
        <span>Export</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-color-card border border-color-border rounded-lg shadow-lg z-50 min-w-max">
          <button
            onClick={exportToCSV}
            disabled={isExporting}
            className="w-full px-4 py-2 text-left text-sm hover:bg-color-muted transition-colors disabled:opacity-50"
          >
            📊 Export as CSV
          </button>
          <button
            onClick={exportToJSON}
            disabled={isExporting}
            className="w-full px-4 py-2 text-left text-sm border-t border-color-border hover:bg-color-muted transition-colors disabled:opacity-50"
          >
            📄 Export as JSON
          </button>
        </div>
      )}
    </div>
  );
}
