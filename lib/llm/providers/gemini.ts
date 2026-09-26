// Gemini provider: structured output via responseMimeType + responseJsonSchema.
// Uses the REST API directly (no SDK dependency). Reads GEMINI_API_KEY.
import { LlmError } from "../errors.ts";
import type { LlmProvider, PromptPart, StructuredRequest } from "../types.ts";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_OUTPUT_TOKENS = 16000;
const TIMEOUT_MS = 120_000;

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string };
};

function toPart(part: PromptPart): GeminiPart {
  return part.type === "pdf"
    ? { inlineData: { mimeType: "application/pdf", data: part.base64 } }
    : { text: part.text };
}

/** Transient statuses: retried with backoff, then on the fallback model. */
const RETRYABLE = new Set([429, 500, 503, 504]);
const FALLBACK_MODEL = "gemini-flash-latest";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function post(model: string, key: string, body: string, promptId: string): Promise<Response> {
  try {
    return await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body,
    });
  } catch (error) {
    throw new LlmError("provider", promptId, "Gemini request failed", { cause: error });
  }
}

async function generateStructured(request: StructuredRequest): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new LlmError("config", request.promptId, "GEMINI_API_KEY is not set");

  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: request.prompt.system }] },
    contents: [{ role: "user", parts: request.prompt.parts.map(toPart) }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: request.outputSchema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });

  // Try the requested model twice, then the fallback model twice, backing off between tries.
  const plan = [
    { model: request.model, waitMs: 0 },
    { model: request.model, waitMs: 1500 },
    { model: FALLBACK_MODEL, waitMs: 1500 },
    { model: FALLBACK_MODEL, waitMs: 4000 },
  ];
  let res: Response | null = null;
  for (const step of plan) {
    if (step.waitMs) await sleep(step.waitMs);
    res = await post(step.model, key, payload, request.promptId);
    if (!RETRYABLE.has(res.status)) break;
    console.warn(`[llm] ${request.promptId}: ${step.model} returned ${res.status}, retrying`);
  }
  if (!res) throw new LlmError("provider", request.promptId, "Gemini request not sent");

  const body = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (!res.ok) {
    const kind = res.status === 429 ? "rate limit / quota" : `HTTP ${res.status}`;
    throw new LlmError(
      "provider",
      request.promptId,
      `Gemini error (${kind}): ${body.error?.message?.split("\n")[0] ?? "unknown"}`,
    );
  }
  if (body.promptFeedback?.blockReason) {
    throw new LlmError("refusal", request.promptId, `Blocked: ${body.promptFeedback.blockReason}`);
  }

  const candidate = body.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new LlmError("truncated", request.promptId, "Output exceeded the token limit");
  }
  if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "RECITATION") {
    throw new LlmError("refusal", request.promptId, `Stopped: ${candidate.finishReason}`);
  }
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new LlmError("no_output", request.promptId, "Gemini returned no text");

  try {
    return JSON.parse(text);
  } catch (error) {
    // Invalid JSON is handed to Zod as a string, which fails validation and triggers the retry.
    console.warn(`[llm] ${request.promptId}: Gemini returned non-JSON`, error);
    return text;
  }
}

export const geminiProvider: LlmProvider = {
  name: "gemini",
  // Free-tier keys have no Pro quota, so "strong" uses Flash too; override with LLM_MODEL_STRONG.
  // 2.5 Flash is the stable default; the newest Flash is the fallback when it is overloaded.
  defaultModels: { strong: "gemini-2.5-flash", fast: "gemini-flash-lite-latest" },
  generateStructured,
};
