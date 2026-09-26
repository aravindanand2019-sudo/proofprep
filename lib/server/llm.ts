// Wraps llm.call() so callers can fall back gracefully when the LLM is unavailable.
import { llm } from "@/lib/llm/call";
import { LlmError } from "@/lib/llm/errors";
import type { PromptId, PromptInput } from "@/lib/llm/prompts";
import { PROVIDER_KEY_ENV } from "@/lib/llm/providers";
import type { z } from "zod";

function keyEnv(): string {
  return PROVIDER_KEY_ENV[process.env.LLM_PROVIDER || "claude"] ?? "ANTHROPIC_API_KEY";
}

export function llmConfigured(): boolean {
  return Boolean(process.env[keyEnv()]);
}

export type LlmOutcome<T> = { ok: true; data: T } | { ok: false; error: string };

/** Never throws: returns { ok: false } with a user-safe message instead. */
export async function tryLlm<P extends PromptId, T>(
  promptId: P,
  input: PromptInput<P>,
  schema: z.ZodType<T>,
  opts: { model?: "strong" | "fast" } = {},
): Promise<LlmOutcome<T>> {
  if (!llmConfigured()) {
    return { ok: false, error: `AI is not configured on this server (${keyEnv()} missing).` };
  }
  try {
    return { ok: true, data: await llm.call(promptId, input, schema, opts) };
  } catch (error) {
    const message =
      error instanceof LlmError && error.kind === "validation"
        ? "The AI returned an invalid answer. Please try again."
        : error instanceof LlmError && error.kind === "refusal"
          ? "The AI declined this request."
          : error instanceof LlmError && /quota|rate limit/i.test(error.message)
            ? "The AI is rate-limited right now. Wait a minute and try again."
            : "The AI service failed. Please try again.";
    console.error(error);
    return { ok: false, error: message };
  }
}
