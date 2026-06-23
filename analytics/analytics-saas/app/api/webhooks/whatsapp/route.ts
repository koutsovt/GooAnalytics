import crypto from "crypto";
import { whatsappWebhookQueue } from "@/lib/queue";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge);
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-hub-signature-256");
    const body = await req.text();

    if (!signature) {
      return Response.json({ error: "Missing signature" }, { status: 400 });
    }

    const appSecret = process.env.WHATSAPP_APP_SECRET || "";
    const hash = crypto.createHmac("sha256", appSecret).update(body).digest("hex");
    const expectedSignature = `sha256=${hash}`;

    if (signature !== expectedSignature) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const messageData = JSON.parse(body);

    await whatsappWebhookQueue.add(
      `whatsapp-${Date.now()}`,
      { messageData },
      { removeOnComplete: true },
    );

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("WhatsApp webhook error:", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
