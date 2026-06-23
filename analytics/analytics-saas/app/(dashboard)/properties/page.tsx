import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportConfigs } from "@/lib/db/schema";
import { PropertiesPageContent } from "@/components/dashboard/properties-page-content";

export default async function PropertiesPage() {
  const userId = await requireSession();

  const configs = await db.query.reportConfigs.findMany({
    where: eq(reportConfigs.userId, userId),
  });

  return <PropertiesPageContent initialConfigs={configs} />;
}
