import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { DeliverButton } from "@/components/dashboard/deliver-button";
import { GenerateReportForm } from "@/components/dashboard/generate-report-form";
import { db } from "@/lib/db";
import { reportConfigs, reportHistory } from "@/lib/db/schema";

export default async function ReportsPage() {
  const userId = await requireSession();
  const ownerId = await resolveOwner(userId);

  const [reports, configs] = await Promise.all([
    db.query.reportHistory.findMany({
      where: eq(reportHistory.userId, ownerId),
      orderBy: desc(reportHistory.createdAt),
    }),
    db.query.reportConfigs.findMany({
      where: eq(reportConfigs.userId, ownerId),
    }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-color-foreground mb-8">Reports</h1>
      <GenerateReportForm configs={configs} />

      {reports.length === 0 ? (
        <div className="rounded-lg border border-color-border bg-color-muted/30 p-8 text-center">
          <p className="text-color-muted-foreground">No reports yet</p>
        </div>
      ) : (
        <div className="rounded-lg border border-color-border overflow-hidden bg-color-card">
          <table className="w-full">
            <thead className="bg-color-muted border-b border-color-border">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-color-foreground">
                  Period
                </th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-color-foreground">
                  Subject Line
                </th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-color-foreground">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-color-foreground">
                  Created
                </th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-color-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-color-border">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-color-muted/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-color-foreground font-mono">
                    {report.period}
                  </td>
                  <td className="px-6 py-4 text-sm text-color-foreground max-w-xs truncate">
                    {report.reportData?.subjectLine || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        report.status === "success"
                          ? "bg-color-success/10 text-color-success"
                          : report.status === "error"
                            ? "bg-color-danger/10 text-color-danger"
                            : "bg-color-warning/10 text-color-warning"
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-color-muted-foreground">
                    {report.createdAt?.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-2">
                    <Link
                      href={`/reports/${report.id}`}
                      className="text-color-brand hover:underline font-medium"
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
      )}
    </div>
  );
}
