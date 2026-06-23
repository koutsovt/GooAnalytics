import { env } from "@/lib/env";
import { buildBriefPrompt } from "@/lib/prompts/brief";
import type { BriefData, ReportOutput } from "@/lib/types/brief";

export async function generateBriefWithGLM(data: BriefData): Promise<ReportOutput> {
  const prompt = buildBriefPrompt(data);
  const apiKey = env.Z_AI_API_KEY;

  console.log(`[GLM] API Key length: ${apiKey?.length}, starts with: ${apiKey?.substring(0, 20)}...`);

  if (!apiKey || apiKey.length < 10) {
    throw new Error(`Z_AI_API_KEY is invalid or not set (length: ${apiKey?.length})`);
  }

  const response = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "glm-4.7",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 1.0,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GLM API error: ${response.status} ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content in GLM response");
  }

  console.log(`[GLM] Raw response content:`, content.substring(0, 200));

  let jsonText = content;
  jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");

  // Escape unescaped newlines in string literals
  jsonText = jsonText.replace(/([^\\]|^)\n/g, "$1\\n");

  console.log(`[GLM] Cleaned JSON text:`, jsonText.substring(0, 200));

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    console.error(`[GLM] JSON parse error:`, error instanceof Error ? error.message : String(error));
    console.error(`[GLM] Full content:`, jsonText.substring(0, 500));
    throw new Error(`Failed to parse GLM response: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!parsed.summary || !parsed.actions || !parsed.subjectLine) {
    throw new Error("Invalid response structure from GLM");
  }

  if (!Array.isArray(parsed.actions) || parsed.actions.length !== 3) {
    throw new Error("Expected exactly 3 actions from GLM");
  }

  return {
    summary: parsed.summary,
    actions: parsed.actions,
    subjectLine: parsed.subjectLine,
  };
}
