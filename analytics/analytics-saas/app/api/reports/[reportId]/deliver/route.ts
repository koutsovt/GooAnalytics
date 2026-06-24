import { eq } from "drizzle-orm";
import { canEditConfig } from "@/lib/auth/permissions";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportHistory } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { deliveryQueue } from "@/lib/queue";
import type { ReportDeliveryJob } from "@/lib/queue/types";
import { rateLimit } from "@/lib/rate-limit";

const VALID_CHANNELS: ReportDeliveryJob["channels"] = ["email", "whatsapp", "slack", "json"];

export async function POST(req: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const userId = await requireSession();
    const ownerId = await resolveOwner(userId);
    const { reportId } = await params;

    // Delivery triggers paid sends (email/WhatsApp), so it is edit-level:
    // owners/admins/editors only.
    if (!(await canEditConfig(userId, ownerId))) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // The report must belong to this workspace. Without this check any logged-in
    // user could deliver another account's report by guessing its id (IDOR).
    const report = await db.query.reportHistory.findFirst({
      where: eq(reportHistory.id, reportId),
    });
    if (!report || report.userId !== ownerId) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    let body: { channels?: unknown } = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      // No/invalid JSON body — fall back to the default channel below.
    }

    const requested = Array.isArray(body.channels) ? body.channels : ["email"];
    const channels = requested.filter((c): c is ReportDeliveryJob["channels"][number] =>
      (VALID_CHANNELS as string[]).includes(c as string),
    );

    if (channels.length === 0) {
      return Response.json(
        { error: "channels must be a non-empty subset of: email, whatsapp, slack, json" },
        { status: 400 },
      );
    }

    // Bound paid-send volume per workspace.
    const limit = await rateLimit(`reports:deliver:${ownerId}`, 20, 60);
    if (!limit.ok) {
      return Response.json(
        { error: "Too many delivery requests. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(limit.resetSeconds) } },
      );
    }

    const job = await deliveryQueue.add(
      `delivery-${reportId}-${Date.now()}`,
      { reportId, userId: ownerId, channels },
      { attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: false },
    );

    return Response.json(
      { success: true, jobId: job.id, status: "queued", message: "Delivery job enqueued" },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to enqueue delivery", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
