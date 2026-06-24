import { eq } from "drizzle-orm";
import Link from "next/link";
import { ReportView } from "@/components/dashboard/report-view";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportHistory } from "@/lib/db/schema";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  await requireSession();
  const { reportId } = await params;

  const report = await db.query.reportHistory.findFirst({
    where: eq(reportHistory.id, reportId),
    with: {
      config: true,
    },
  });

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Report not found</p>
        <Link href="/reports" className="text-brand hover:underline mt-4 inline-block">
          Back to reports
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/reports" className="text-brand hover:underline text-sm mb-4 inline-block">
        ← Back
      </Link>

      {report.status === "error" ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-8 py-8 border-b border-border">
            <div className="text-xs font-semibold uppercase tracking-[0.32em] text-danger mb-3">
              Report failed
            </div>
            <h1 className="text-3xl font-bold text-foreground">{report.period}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Generated {report.createdAt?.toLocaleString() ?? "—"}
            </p>
          </div>
          <div className="px-8 py-6">
            <p className="text-sm text-foreground mb-2 font-medium">What went wrong</p>
            <pre className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg p-4 whitespace-pre-wrap break-words">
              {report.errorMessage || "Unknown error"}
            </pre>
          </div>
        </div>
      ) : (
        <ReportView
          businessName={report.rawData?.businessName ?? report.config?.businessName ?? "Report"}
          period={report.period}
          createdAtLabel={report.createdAt?.toLocaleString() ?? "—"}
          reportData={report.reportData}
          rawData={report.rawData}
        />
      )}
    </div>
  );
}
