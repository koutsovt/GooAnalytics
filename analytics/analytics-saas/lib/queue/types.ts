export interface ReportGenerationJob {
  userId: string;
  configId: string;
  periodStart: string;
  periodEnd: string;
  model?: "claude" | "glm";
}

export interface ReportDeliveryJob {
  reportId: string;
  userId: string;
  channels: ("email" | "whatsapp" | "slack" | "json")[];
}

export interface StripeWebhookJob {
  eventType: string;
  eventData: Record<string, unknown>;
}

export interface WhatsAppWebhookJob {
  messageData: Record<string, unknown>;
}
