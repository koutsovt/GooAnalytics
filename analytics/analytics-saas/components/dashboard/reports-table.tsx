"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DeliverButton } from "@/components/dashboard/deliver-button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ReportRow {
  id: string;
  period: string;
  subjectLine: string | null;
  status: string;
  // Pre-formatted on the server. Formatting here in the client component would
  // run during both SSR and hydration and mismatch when the server locale differs
  // from the browser's, so the date is rendered to a string upstream.
  createdAtLabel: string;
}

function statusVariant(status: string): BadgeProps["variant"] {
  if (status === "success") return "success";
  if (status === "error") return "danger";
  return "warning";
}

export function ReportsTable({ reports }: { reports: ReportRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const allSelected = reports.length > 0 && selected.size === reports.length;
  const someSelected = selected.size > 0 && !allSelected;

  // Native checkboxes can't express "indeterminate" via props, so set it imperatively.
  const headerRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(reports.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!confirm(`Delete ${count} report${count > 1 ? "s" : ""}? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error ?? "Failed to delete reports"}`);
        return;
      }

      setSelected(new Set());
      router.refresh();
    } catch (err) {
      alert(`Failed to delete reports: ${err}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {selected.size > 0 && (
        <div className="flex items-center justify-between mb-3 px-4 py-2 rounded-lg border border-border bg-muted/40">
          <span className="text-sm text-foreground">
            {selected.size} selected
          </span>
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete selected"}
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 w-px">
                <input
                  ref={headerRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all reports"
                  className="h-4 w-4 cursor-pointer accent-brand align-middle"
                />
              </th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">
                Period
              </th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">
                Subject Line
              </th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">
                Status
              </th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">
                Created
              </th>
              <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reports.map((report) => (
              <tr
                key={report.id}
                className={`transition-colors ${
                  selected.has(report.id) ? "bg-muted/40" : "hover:bg-muted/50"
                }`}
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(report.id)}
                    onChange={() => toggleOne(report.id)}
                    aria-label={`Select report ${report.period}`}
                    className="h-4 w-4 cursor-pointer accent-brand align-middle"
                  />
                </td>
                <td className="px-6 py-4 text-sm text-foreground font-mono">
                  {report.period}
                </td>
                <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">
                  {report.subjectLine || "—"}
                </td>
                <td className="px-6 py-4 text-sm">
                  <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {report.createdAtLabel}
                </td>
                <td className="px-6 py-4 text-right text-sm space-x-2">
                  <Link
                    href={`/reports/${report.id}`}
                    className="text-brand hover:underline font-medium"
                  >
                    View
                  </Link>
                  <DeliverButton reportId={report.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
