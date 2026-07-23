import { eq } from "drizzle-orm";
import { canManageProperties } from "@/lib/auth/permissions";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
import { resolvePlaceId } from "@/lib/clients/places";
import { db } from "@/lib/db";
import { reportConfigs, subscriptions } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { effectiveTier, PLANS } from "@/lib/plans";
import { sameHost } from "@/lib/url";
import { createConfigSchema } from "@/lib/validation";

export async function GET() {
  try {
    const userId = await requireSession();
    // Configs belong to the billing owner. Resolve it so team members see the
    // shared workspace's sites, not an empty list keyed to their own id.
    const ownerId = await resolveOwner(userId);

    const configs = await db.query.reportConfigs.findMany({
      where: eq(reportConfigs.userId, ownerId),
    });

    return Response.json(configs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to fetch configs:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireSession();

    const parsed = createConfigSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const {
      ga4PropertyId,
      gscSiteUrl,
      gbpLocationId,
      recipientEmail,
      recipientPhone,
      scheduleFrequency,
      scheduleDayOfMonth,
      scheduleDayOfWeek,
      scheduleTime,
      scheduleTimezone,
    } = parsed.data;

    // Configs are owned by the billing owner; resolve it for both the permission
    // check and the row we write, so a member's site lands in the owner's
    // workspace (and the cron worker can use the owner's Google tokens).
    const ownerId = await resolveOwner(userId);

    // Viewers are read-only. Only the owner and editors/admins may add a site.
    if (!(await canManageProperties(userId, ownerId))) {
      return Response.json({ error: "You do not have permission to add a site" }, { status: 403 });
    }

    // Enforce the plan's site limit against the billing owner. The owner pays,
    // so the owner's tier governs how many sites their workspace may hold.
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ownerId),
    });
    const tier = effectiveTier(subscription?.plan, subscription?.active ?? false);
    const siteLimit = PLANS[tier].siteLimit;
    const siteCount = await db.$count(reportConfigs, eq(reportConfigs.userId, ownerId));

    if (siteCount >= siteLimit) {
      const message =
        siteLimit === 0
          ? "Start a plan to add your first site."
          : `Your ${PLANS[tier].label} plan allows ${siteLimit} site${
              siteLimit === 1 ? "" : "s"
            }. Upgrade to add more.`;
      return Response.json({ error: message, code: "site_limit_reached" }, { status: 403 });
    }

    const businessName = new URL(gscSiteUrl).hostname;

    // Resolve the Google Place ID once, now, so every future report does a
    // deterministic lookup instead of a fuzzy name search. Only store it when
    // the matched listing's website is the configured site, so we never lock a
    // config to a different same-named business. Best-effort: a miss or API
    // error leaves placeId null and the report-time text-search fallback handles
    // reputation — it must never block config creation.
    let placeId: string | null = null;
    // Google's own primary category (e.g. "Hair Salon") seeds competitor
    // discovery far better than the domain name. Captured here once, alongside
    // the Place ID, so future reports search the right thing.
    let businessType: string | null = null;
    try {
      const resolved = await resolvePlaceId(businessName);
      if (resolved && sameHost(resolved.websiteUri, gscSiteUrl)) {
        placeId = resolved.placeId;
        businessType = resolved.primaryType || null;
      }
    } catch (err) {
      logger.warn("Place ID resolution skipped:", err instanceof Error ? err.message : err);
    }

    const id = `cfg_${ownerId}_${Date.now()}`;
    await db.insert(reportConfigs).values({
      id,
      userId: ownerId,
      businessName,
      ga4PropertyId,
      gscSiteUrl,
      gbpLocationId,
      placeId,
      businessType,
      recipientEmail,
      recipientPhone,
      scheduleFrequency: scheduleFrequency ?? "monthly",
      scheduleDayOfMonth: scheduleDayOfMonth ?? 1,
      scheduleDayOfWeek: scheduleDayOfWeek ?? 1,
      scheduleTime: scheduleTime ?? "09:00",
      scheduleTimezone: scheduleTimezone ?? "Australia/Sydney",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to create config:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
