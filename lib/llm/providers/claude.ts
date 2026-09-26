// Claude provider: structured output via a single forced tool call.
import Anthropic from "@anthropic-ai/sdk";
import { LlmError } from "../errors.ts";
import type { LlmProvider, PromptPart, StructuredRequest } from "../types.ts";

const MAX_TOKENS = 16000;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  // Reads ANTHROPIC_API_KEY from the environment.
  client ??= new Anthropic();
  return client;
}

function toContentBlock(part: PromptPart): Anthropic.ContentBlockParam {
  if (part.type === "pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: part.base64 },
    };
  }
  return { type: "text", text: part.text };
}

function toProviderError(promptId: string, error: unknown): LlmError {
  if (error instanceof Anthropic.APIError) {
    return new LlmError(
      "provider",
      promptId,
      `Claude API error ${error.status}: ${error.message}`,
      {
        cause: error,
      },
    );
  }
  return new LlmError("provider", promptId, "Claude request failed", { cause: error });
}

async function generateStructured(request: StructuredRequest): Promise<unknown> {
  const tool: Anthropic.Tool = {
    name: request.outputName,
    description: "Submit the final result. Always call this exactly once with the complete output.",
    input_schema: request.outputSchema,
  };

  let response: Anthropic.Message;
  try {
    response = await getClient().messages.create({
      model: request.model,
      max_tokens: MAX_TOKENS,
      system: request.prompt.system,
      messages: [{ role: "user", content: request.prompt.parts.map(toContentBlock) }],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      // Forced tool choice is not combined with thinking; see README "LLM layer".
      thinking: { type: "disabled" },
    });
  } catch (error) {
    throw toProviderError(request.promptId, error);
  }

  if (response.stop_reason === "refusal") {
    throw new LlmError("refusal", request.promptId, "Model declined the request");
  }
  if (response.stop_reason === "max_tokens") {
    throw new LlmError("truncated", request.promptId, `Output exceeded ${MAX_TOKENS} tokens`);
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === tool.name,
  );
  if (!toolUse) {
    throw new LlmError("no_output", request.promptId, "Model did not call the output tool");
  }
  return toolUse.input;
}

export const claudeProvider: LlmProvider = {
  name: "claude",
  // PLAN.md Section 6: Sonnet for most calls, Haiku for high-volume ones.
  defaultModels: { strong: "claude-sonnet-5", fast: "claude-haiku-4-5-20251001" },
  generateStructured,
};
