import { env } from "@/lib/env";
import { buildBriefPrompt } from "@/lib/prompts/brief";
import type { BriefData, ReportOutput } from "@/lib/types/brief";

// The model returns a pretty-printed JSON object whose string values (the
// summary) contain real newlines between paragraphs. Raw control characters
// inside a JSON string are invalid, so escape \n\r\t but only while inside a
// string literal — structural newlines between tokens are left alone (JSON.parse
// allows them as whitespace).
function escapeControlCharsInStrings(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of input) {
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString && (ch === "\n" || ch === "\r" || ch === "\t")) {
      out += ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : "\\t";
      continue;
    }
    out += ch;
  }
  return out;
}

export async function generateBriefWithGLM(data: BriefData): Promise<ReportOutput> {
  const prompt = buildBriefPrompt(data);
  const apiKey = env.Z_AI_API_KEY;

  if (!apiKey || apiKey.length < 10) {
    throw new Error("Z_AI_API_KEY is invalid or not set");
  }

  // This brief is a plain data-to-prose task that needs no chain of thought, so
  // disable thinking — it keeps the call fast and returns clean, complete JSON
  // instead of burning reasoning tokens and risking a mid-string truncation.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "glm-5.2",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 1.0,
        thinking: { type: "disabled" },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("GLM request timed out after 60s");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GLM API error: ${response.status} ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content in GLM response");
  }

  let jsonText = content.trim();
  // Strip optional ```json fences the model sometimes wraps the object in.
  jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  jsonText = escapeControlCharsInStrings(jsonText);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // Keep a short snippet of the offending text in the error itself so it lands
    // in report_history.errorMessage (and the UI) if this ever recurs.
    throw new Error(
      `Failed to parse GLM response: ${reason} — received: ${jsonText.slice(0, 200)}`,
    );
  }

  if (!parsed.summary || !parsed.actions || !parsed.subjectLine) {
    // Surface which keys came back so a recurrence is diagnosable from
    // report_history.errorMessage instead of a blind "invalid structure".
    const keys = Object.keys(parsed).join(", ") || "(none)";
    throw new Error(`Invalid response structure from GLM — got keys: [${keys}]`);
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
