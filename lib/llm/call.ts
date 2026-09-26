// The single entry point for every LLM call (PLAN.md Section 7).
import { z } from "zod";
import { LlmError } from "./errors.ts";
import { prompts, type PromptId, type PromptInput } from "./prompts/index.ts";
import { getProvider, resolveModel } from "./providers/index.ts";
import type { JsonObjectSchema, LlmProvider, ModelTier, RenderedPrompt } from "./types.ts";

if (typeof window !== "undefined") {
  throw new Error("lib/llm is server-only; call it from API routes or server code.");
}

export type CallOptions = {
  /** "strong" (default) or "fast" (high-volume calls such as P4 and P9). */
  model?: ModelTier;
};

type AttemptLog = {
  promptId: string;
  provider: string;
  model: string;
  attempt: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
};

function log(entry: AttemptLog): void {
  const line = `[llm] ${JSON.stringify(entry)}`;
  if (entry.ok) {
    console.info(line);
  } else {
    console.warn(line);
  }
}

function toOutputSchema(promptId: string, schema: z.ZodType): JsonObjectSchema {
  let json: Record<string, unknown>;
  try {
    json = z.toJSONSchema(schema, { io: "output" });
  } catch (error) {
    throw new LlmError("config", promptId, "Output schema cannot be expressed as JSON Schema", {
      cause: error,
    });
  }
  const { $schema: _ignored, ...rest } = json;
  if (rest.type !== "object") {
    throw new LlmError("config", promptId, "Output schema must be a z.object()");
  }
  return { ...rest, type: "object" };
}

/** Appends the validation failure so the model can correct itself on the retry. */
function withRetryFeedback(
  prompt: RenderedPrompt,
  previous: unknown,
  error: z.ZodError,
): RenderedPrompt {
  const feedback = [
    "Your previous output failed validation.",
    `Previous output: ${JSON.stringify(previous)}`,
    `Validation errors:\n${z.prettifyError(error)}`,
    "Produce the complete output again, fixing every error.",
  ].join("\n\n");
  return { ...prompt, parts: [...prompt.parts, { type: "text", text: feedback }] };
}

/**
 * One provider call plus validation, logged as a single line.
 * Provider errors are logged and rethrown; validation failures are returned.
 */
async function attempt<T>(
  provider: LlmProvider,
  promptId: string,
  model: string,
  prompt: RenderedPrompt,
  schema: z.ZodType<T>,
  outputSchema: JsonObjectSchema,
  attemptNumber: number,
): Promise<{ output: unknown; result: z.ZodSafeParseResult<T> }> {
  const started = Date.now();
  const base = { promptId, provider: provider.name, model, attempt: attemptNumber };
  let output: unknown;
  try {
    output = await provider.generateStructured({
      promptId,
      model,
      prompt,
      outputName: `submit_${promptId.replace(/-/g, "_")}`,
      outputSchema,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log({ ...base, latencyMs: Date.now() - started, ok: false, error: message });
    throw error;
  }
  const result = schema.safeParse(output);
  log({
    ...base,
    latencyMs: Date.now() - started,
    ok: result.success,
    ...(result.success ? {} : { error: `validation: ${result.error.issues.length} issue(s)` }),
  });
  return { output, result };
}

async function call<P extends PromptId, T>(
  promptId: P,
  input: PromptInput<P>,
  schema: z.ZodType<T>,
  opts: CallOptions = {},
): Promise<T> {
  const provider = getProvider(promptId);
  const model = resolveModel(provider, opts.model ?? "strong");
  const outputSchema = toOutputSchema(promptId, schema);
  const render = prompts[promptId] as (input: PromptInput<P>) => RenderedPrompt;
  const prompt = render(input);

  const first = await attempt(provider, promptId, model, prompt, schema, outputSchema, 1);
  if (first.result.success) {
    return first.result.data;
  }

  const retryPrompt = withRetryFeedback(prompt, first.output, first.result.error);
  const second = await attempt(provider, promptId, model, retryPrompt, schema, outputSchema, 2);
  if (second.result.success) {
    return second.result.data;
  }
  throw new LlmError("validation", promptId, "Output failed schema validation after one retry", {
    issues: second.result.error.issues,
  });
}

export const llm = { call };
