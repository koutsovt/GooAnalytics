import { desc, eq } from "drizzle-orm";
import { GenerateReportForm } from "@/components/dashboard/generate-report-form";
import { ReportsTable } from "@/components/dashboard/reports-table";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
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
      <h1 className="text-3xl font-bold text-foreground mb-8">Reports</h1>
      <GenerateReportForm configs={configs} />

      {reports.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">No reports yet</p>
        </div>
      ) : (
        <ReportsTable
          reports={reports.map((report) => ({
            id: report.id,
            period: report.period,
            subjectLine: report.reportData?.subjectLine ?? null,
            status: report.status,
            createdAtLabel: report.createdAt ? report.createdAt.toLocaleDateString() : "—",
          }))}
        />
      )}
    </div>
  );
}
