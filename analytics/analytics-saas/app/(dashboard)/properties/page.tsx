import { eq } from "drizzle-orm";
import { PropertiesPageContent } from "@/components/dashboard/properties-page-content";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportConfigs, users } from "@/lib/db/schema";

export default async function PropertiesPage() {
  const userId = await requireSession();
  // Configs belong to the billing owner, so team members see the shared
  // workspace's sites — consistent with the dashboard/reports/billing pages.
  const ownerId = await resolveOwner(userId);

  const [configs, currentUser] = await Promise.all([
    db.query.reportConfigs.findMany({
      where: eq(reportConfigs.userId, ownerId),
    }),
    db.query.users.findFirst({
      where: eq(users.id, userId),
    }),
  ]);

  return (
    <PropertiesPageContent initialConfigs={configs} defaultEmail={currentUser?.email ?? ""} />
  );
}
