import { LlmError } from "../errors.ts";
import type { LlmProvider, ModelTier } from "../types.ts";
import { claudeProvider } from "./claude.ts";
import { geminiProvider } from "./gemini.ts";

// To add a provider: implement LlmProvider in its own file and register it here.
const providers: Record<string, LlmProvider> = {
  claude: claudeProvider,
  gemini: geminiProvider,
};

/** API-key env var each provider needs, so callers can fail fast with a clear message. */
export const PROVIDER_KEY_ENV: Record<string, string> = {
  claude: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
};

export function getProvider(promptId: string): LlmProvider {
  const name = process.env.LLM_PROVIDER || "claude";
  const provider = providers[name];
  if (!provider) {
    throw new LlmError("config", promptId, `Unknown LLM_PROVIDER "${name}"`);
  }
  return provider;
}

export function resolveModel(provider: LlmProvider, tier: ModelTier): string {
  const override = tier === "strong" ? process.env.LLM_MODEL_STRONG : process.env.LLM_MODEL_FAST;
  return override || provider.defaultModels[tier];
}
