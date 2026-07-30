export interface ReportGenerationJob {
  userId: string;
  configId: string;
  periodStart: string;
  periodEnd: string;
  model?: "claude" | "glm";
  // "cron" jobs have no one watching the dashboard to click "Deliver", so the
  // worker auto-enqueues delivery on success when this is "cron". Manual
  // "Generate" (dashboard button) omits this / passes "manual" so the client
  // can review the report first and deliver on demand, as today.
  trigger?: "cron" | "manual";
}

export const DELIVERY_CHANNELS = ["email", "whatsapp", "slack", "json"] as const;
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

// Shared between the manual /deliver route (filtering a request body) and the
// report worker (filtering a config's stored `activeChannels` JSON column) so
// both reject the same unrecognized values the same way. Falls back to
// `["email"]` for anything that isn't a non-empty array of known channels,
// matching the column's own DB default.
export function parseDeliveryChannels(value: unknown): DeliveryChannel[] {
  if (!Array.isArray(value)) return ["email"];
  const channels = value.filter((c): c is DeliveryChannel =>
    (DELIVERY_CHANNELS as readonly string[]).includes(c as string),
  );
  return channels.length > 0 ? channels : ["email"];
}

export interface ReportDeliveryJob {
  reportId: string;
  userId: string;
  channels: DeliveryChannel[];
}

export interface StripeWebhookJob {
  eventType: string;
  eventData: Record<string, unknown>;
}

export interface WhatsAppWebhookJob {
  messageData: Record<string, unknown>;
}
