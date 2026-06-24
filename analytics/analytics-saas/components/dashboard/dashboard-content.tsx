import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SessionsChart } from "@/components/charts/sessions-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface DashboardData {
  hasReports: boolean;
  period: string;
  latestReportId: string | null;
  gbpConnected: boolean;
  sessions: number;
  sessionsDelta: number;
  impressions: number;
  clicks: number;
  rating: number;
  totalReviews: number;
  chartData: Array<{ period: string; sessions: number }>;
  sessionsSpark: Array<{ value: number }>;
  impressionsSpark: Array<{ value: number }>;
  clicksSpark: Array<{ value: number }>;
  ratingSpark: Array<{ value: number }>;
}

export function DashboardContent({ data }: { data: DashboardData }) {
  if (!data.hasReports) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Overview</h1>
        <p className="text-muted-foreground mb-8">Your latest brief at a glance.</p>
        <Card className="p-10 text-center">
          <p className="text-foreground font-medium">No reports yet</p>
          <p className="text-muted-foreground text-sm mt-1 mb-6">
            Add your website and generate your first monthly brief to see your numbers here.
          </p>
          <Button asChild>
            <Link href="/reports">Generate a report</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Latest brief · {data.period}</p>
        </div>
        {data.latestReportId && (
          <Button asChild variant="outline">
            <Link href={`/reports/${data.latestReportId}`}>
              View full brief
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Visitors"
          value={data.sessions.toLocaleString()}
          delta={data.sessionsDelta || undefined}
          comparison={data.sessionsDelta ? "vs last period" : undefined}
          unit="website sessions"
          sparkData={data.sessionsSpark}
        />
        <StatCard
          label="Search impressions"
          value={data.impressions.toLocaleString()}
          unit="shown in Google"
          sparkData={data.impressionsSpark}
        />
        <StatCard
          label="Search clicks"
          value={data.clicks.toLocaleString()}
          unit="visits from search"
          sparkData={data.clicksSpark}
        />
        <StatCard
          label="Avg rating"
          value={data.gbpConnected ? data.rating.toFixed(1) : "—"}
          unit={data.gbpConnected ? `${data.totalReviews.toLocaleString()} reviews` : "not connected"}
          sparkData={data.gbpConnected ? data.ratingSpark : undefined}
        />
      </div>

      {data.chartData.length > 1 && (
        <SessionsChart
          data={data.chartData}
          title="Visitors over time"
          description="Website sessions across your recent reports"
        />
      )}
    </div>
  );
}
