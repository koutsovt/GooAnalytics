"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { reportConfigs } from "@/lib/db/schema";
import type { ReportGenerationJob } from "@/lib/queue/types";

interface GenerateReportFormProps {
  configs: (typeof reportConfigs.$inferSelect)[];
}

type Status =
  | { kind: "idle" }
  | { kind: "queued"; jobId: string }
  | { kind: "error"; message: string };

// Generation runs in a background worker (~1-2 min) and writes the report row when
// done, so poll-refresh the server-rendered list until it appears.
const POLL_INTERVAL_MS = 5000;
const POLL_MAX_TRIES = 24;

export function GenerateReportForm({ configs }: GenerateReportFormProps) {
  const router = useRouter();
  const [selectedConfigId, setSelectedConfigId] = useState(configs[0]?.id ?? "");
  const [periodStart, setPeriodStart] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Clear any in-flight poll when the component unmounts.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = () => {
    stopPolling();
    let tries = 0;
    pollRef.current = setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= POLL_MAX_TRIES) stopPolling();
    }, POLL_INTERVAL_MS);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ kind: "idle" });

    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configId: selectedConfigId,
          periodStart,
          periodEnd,
        } as Omit<ReportGenerationJob, "userId">),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus({ kind: "error", message: result.error ?? "Failed to queue report" });
        return;
      }

      setStatus({ kind: "queued", jobId: result.jobId });
      router.refresh();
      startPolling();
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to queue report",
      });
    } finally {
      setLoading(false);
    }
  };

  if (configs.length === 0) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Generate New Report</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Property
            </label>
            <select
              value={selectedConfigId}
              onChange={(e) => setSelectedConfigId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground"
            >
              {configs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.gscSiteUrl || config.businessName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                End Date
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>

        {status.kind === "queued" && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded text-sm text-warning">
            Report queued (Job <code className="font-mono">{status.jobId}</code>). Generating… this
            can take a minute — the list below updates automatically when it&apos;s ready.
          </div>
        )}

        {status.kind === "error" && (
          <div className="mt-4 p-3 bg-danger/10 border border-danger/30 rounded text-sm text-danger">
            {status.message}
          </div>
        )}
      </div>
    </form>
  );
}
