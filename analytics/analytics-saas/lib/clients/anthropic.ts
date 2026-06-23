import { Anthropic } from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { buildBriefPrompt } from "@/lib/prompts/brief";
import type { BriefData, ReportOutput } from "@/lib/types/brief";

const client = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export async function generateBrief(data: BriefData): Promise<ReportOutput> {
  const prompt = buildBriefPrompt(data);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  let jsonText = content.text;
  jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");

  const parsed = JSON.parse(jsonText);

  if (!parsed.summary || !parsed.actions || !parsed.subjectLine) {
    throw new Error("Invalid response structure from Claude");
  }

  if (!Array.isArray(parsed.actions) || parsed.actions.length !== 3) {
    throw new Error("Expected exactly 3 actions from Claude");
  }

  return {
    summary: parsed.summary,
    actions: parsed.actions,
    subjectLine: parsed.subjectLine,
  };
}
