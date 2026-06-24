import { eq } from "drizzle-orm";
import { PropertiesPageContent } from "@/components/dashboard/properties-page-content";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportConfigs } from "@/lib/db/schema";

export default async function PropertiesPage() {
  const userId = await requireSession();
  // Configs belong to the billing owner, so team members see the shared
  // workspace's sites — consistent with the dashboard/reports/billing pages.
  const ownerId = await resolveOwner(userId);

  const configs = await db.query.reportConfigs.findMany({
    where: eq(reportConfigs.userId, ownerId),
  });

  return <PropertiesPageContent initialConfigs={configs} />;
}
