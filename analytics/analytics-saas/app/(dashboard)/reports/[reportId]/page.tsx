import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportHistory } from "@/lib/db/schema";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const userId = await requireSession();
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
        <p className="text-color-muted-foreground">Report not found</p>
        <Link href="/reports" className="text-color-brand hover:underline mt-4 inline-block">
          Back to reports
        </Link>
      </div>
    );
  }

  const rawData = report.rawData;
  const reportData = report.reportData;

  return (
    <div>
      <Link href="/reports" className="text-color-brand hover:underline text-sm mb-4 inline-block">
        ← Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-color-foreground">{report.period}</h1>
        <div className="flex items-center gap-4 mt-4">
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
          <p className="text-sm text-color-muted-foreground">
            Generated: {report.createdAt?.toLocaleString()}
          </p>
        </div>
      </div>

      {reportData && (
        <div className="rounded-lg border border-color-border bg-color-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-color-foreground mb-4">AI Brief</h2>
          <p className="text-color-foreground leading-relaxed mb-6">{reportData.summary}</p>

          <h3 className="font-semibold text-color-foreground mb-3">Recommended Actions:</h3>
          <ul className="space-y-2">
            {reportData.actions?.map((action, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-color-brand font-bold mt-0.5">•</span>
                <span className="text-color-foreground">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rawData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-color-border bg-color-card p-4">
              <p className="text-sm text-color-muted-foreground mb-1">Sessions</p>
              <p className="text-2xl font-bold text-color-foreground">
                {rawData.website?.sessions?.toLocaleString() ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-color-border bg-color-card p-4">
              <p className="text-sm text-color-muted-foreground mb-1">Search Impressions</p>
              <p className="text-2xl font-bold text-color-foreground">
                {rawData.search?.impressions?.toLocaleString() ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-color-border bg-color-card p-4">
              <p className="text-sm text-color-muted-foreground mb-1">Local Interactions</p>
              <p className="text-2xl font-bold text-color-foreground">
                {rawData.local?.totalInteractions?.toLocaleString() ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-color-border bg-color-card p-4">
              <p className="text-sm text-color-muted-foreground mb-1">Avg Rating</p>
              <p className="text-2xl font-bold text-color-foreground">
                {rawData.reputation?.averageRating?.toFixed(2) ?? "—"}
              </p>
            </div>
          </div>

          {rawData.website?.topPages && rawData.website.topPages.length > 0 && (
            <div className="rounded-lg border border-color-border bg-color-card p-6">
              <h3 className="text-lg font-semibold text-color-foreground mb-4">Top Pages</h3>
              <table className="w-full text-sm">
                <thead className="border-b border-color-border">
                  <tr>
                    <th className="text-left py-2 font-medium text-color-muted-foreground">Path</th>
                    <th className="text-right py-2 font-medium text-color-muted-foreground">
                      Views
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-color-border">
                  {rawData.website.topPages.map((page, i) => (
                    <tr key={i}>
                      <td className="py-3 text-color-foreground">{page.path}</td>
                      <td className="py-3 text-right text-color-foreground font-mono">
                        {page.views.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rawData.search?.topQueries && rawData.search.topQueries.length > 0 && (
            <div className="rounded-lg border border-color-border bg-color-card p-6">
              <h3 className="text-lg font-semibold text-color-foreground mb-4">
                Top Search Queries
              </h3>
              <table className="w-full text-sm">
                <thead className="border-b border-color-border">
                  <tr>
                    <th className="text-left py-2 font-medium text-color-muted-foreground">
                      Query
                    </th>
                    <th className="text-right py-2 font-medium text-color-muted-foreground">
                      Clicks
                    </th>
                    <th className="text-right py-2 font-medium text-color-muted-foreground">
                      Impressions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-color-border">
                  {rawData.search.topQueries.map((q, i) => (
                    <tr key={i}>
                      <td className="py-3 text-color-foreground">{q.query}</td>
                      <td className="py-3 text-right text-color-foreground font-mono">
                        {q.clicks}
                      </td>
                      <td className="py-3 text-right text-color-foreground font-mono">
                        {q.impressions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
