"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { teamInvitations, teamMembers, users } from "@/lib/db/schema";
import { AuditLogsViewer } from "@/components/dashboard/audit-logs-viewer";

interface TeamPageContentProps {
  initialMembers: Array<typeof teamMembers.$inferSelect & { member: typeof users.$inferSelect }>;
  initialInvitations: Array<typeof teamInvitations.$inferSelect>;
}

export function TeamPageContent({ initialMembers, initialInvitations }: TeamPageContentProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor" | "admin">("viewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send invitation");
      }

      setEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const res = await fetch(`/api/team/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove member");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/team/members/${memberId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to change role");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleResendInvite = async (invId: string) => {
    try {
      const res = await fetch(`/api/team/invitations/${invId}/resend`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to resend invitation");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleCancelInvite = async (invId: string) => {
    try {
      const res = await fetch(`/api/team/invitations/${invId}/cancel`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel invitation");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const getTimeUntilExpiry = (expiresAt: Date) => {
    const now = new Date();
    const diff = new Date(expiresAt).getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days}d` : "expired";
  };

  const pendingInvitations = initialInvitations.filter((i) => !i.acceptedAt);

  return (
    <div>
      <h1 className="text-4xl font-bold text-foreground mb-8">Team</h1>

      <div className="rounded-lg border border-border bg-input p-6 max-w-md mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Invite a Team Member</h2>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-base font-semibold text-foreground mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground"
              placeholder="colleague@example.com"
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-foreground mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "viewer" | "editor" | "admin")}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground"
            >
              <option value="viewer">Viewer (read-only)</option>
              <option value="editor">Editor (can modify configs)</option>
              <option value="admin">Admin (can manage team)</option>
            </select>
          </div>
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-base text-red-700 dark:text-red-400 font-medium">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-3 rounded-lg bg-brand text-white font-bold text-base hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Invitation"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-input p-6 max-w-md mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Members</h2>
        {initialMembers.length === 0 ? (
          <p className="text-foreground text-base font-medium">No members yet.</p>
        ) : (
          <ul className="space-y-3">
            {initialMembers.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <div>
                  <p className="text-foreground text-base font-medium">{m.member.email}</p>
                  <select
                    value={m.role}
                    onChange={(e) => handleChangeRole(m.memberId, e.target.value)}
                    className="text-xs bg-input text-foreground border border-border rounded px-2 py-1"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  onClick={() => handleRemove(m.memberId)}
                  className="text-sm font-medium text-red-500 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border bg-input p-6 max-w-md">
        <h2 className="text-2xl font-bold text-foreground mb-4">Pending Invitations</h2>
        {pendingInvitations.length === 0 ? (
          <p className="text-foreground text-base font-medium">No pending invitations.</p>
        ) : (
          <ul className="space-y-3">
            {pendingInvitations.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between">
                <div>
                  <p className="text-foreground text-base font-medium">{inv.inviteeEmail}</p>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-foreground font-medium">
                      Expires in {getTimeUntilExpiry(inv.expiresAt)}
                    </span>
                    <span className="text-sm text-foreground font-medium uppercase tracking-wide">
                      {inv.role}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResendInvite(inv.id)}
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => handleCancelInvite(inv.id)}
                    className="text-sm font-medium text-red-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border bg-input p-6 max-w-2xl">
        <h2 className="text-2xl font-bold text-foreground mb-4">Activity Log</h2>
        <AuditLogsViewer />
      </div>
    </div>
  );
}
