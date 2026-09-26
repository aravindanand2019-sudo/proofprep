// Provider-agnostic types for the LLM layer.

export type ModelTier = "strong" | "fast";

/** One piece of user content. PDFs are passed natively (PLAN.md Section 7). */
export type PromptPart = { type: "text"; text: string } | { type: "pdf"; base64: string };

/** What every prompt template in lib/llm/prompts returns. */
export type RenderedPrompt = {
  system: string;
  parts: PromptPart[];
};

/** A JSON Schema object describing the required output (always `type: "object"`). */
export type JsonObjectSchema = Record<string, unknown> & { type: "object" };

export type StructuredRequest = {
  promptId: string;
  model: string;
  prompt: RenderedPrompt;
  /** Name the provider gives the output (e.g. the tool name for Claude). */
  outputName: string;
  outputSchema: JsonObjectSchema;
};

/**
 * Implement this interface to add a provider (e.g. lib/llm/providers/gemini.ts),
 * then register it in lib/llm/providers/index.ts.
 */
export interface LlmProvider {
  readonly name: string;
  readonly defaultModels: Record<ModelTier, string>;
  /** Returns the raw, unvalidated structured output. Validation happens in call.ts. */
  generateStructured(request: StructuredRequest): Promise<unknown>;
}
