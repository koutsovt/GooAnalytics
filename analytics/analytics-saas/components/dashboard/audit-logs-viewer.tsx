"use client";

import { useEffect, useState } from "react";

interface AuditLog {
  id: string;
  ownerId: string;
  action: string;
  actorId: string;
  targetEmail: string | null;
  targetMemberId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

interface AuditLogsViewerProps {
  onLoad?: () => void;
}

export function AuditLogsViewer({ onLoad }: AuditLogsViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadLogs();
    onLoad?.();
  }, [onLoad]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/team/audit-logs?page=${page}&limit=20`);
      if (!res.ok) throw new Error("Failed to load audit logs");
      const data = await res.json();
      setLogs(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      team_invite_sent: "Sent invitation",
      team_invite_accepted: "Accepted invitation",
      team_invite_resent: "Resent invitation",
      team_invite_cancelled: "Cancelled invitation",
      team_member_removed: "Removed member",
      team_member_role_changed: "Changed role",
    };
    return labels[action] || action;
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return <div className="text-color-muted-foreground">Loading audit logs...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>;
  }

  if (logs.length === 0) {
    return <div className="text-color-muted-foreground text-sm">No audit logs yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-color-border">
            <th className="text-left px-4 py-2 font-semibold text-color-foreground">Action</th>
            <th className="text-left px-4 py-2 font-semibold text-color-foreground">Target</th>
            <th className="text-left px-4 py-2 font-semibold text-color-foreground">Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-color-border hover:bg-color-surface">
              <td className="px-4 py-3 text-color-foreground">{getActionLabel(log.action)}</td>
              <td className="px-4 py-3 text-color-muted-foreground">
                {log.targetEmail || log.targetMemberId || "—"}
              </td>
              <td className="px-4 py-3 text-color-muted-foreground text-xs">
                {formatDate(log.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => {
            setPage(Math.max(1, page - 1));
            loadLogs();
          }}
          disabled={page === 1}
          className="px-3 py-1 rounded bg-color-brand text-white text-sm disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-color-muted-foreground">Page {page}</span>
        <button
          onClick={() => {
            setPage(page + 1);
            loadLogs();
          }}
          className="px-3 py-1 rounded bg-color-brand text-white text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}
