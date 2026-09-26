// P9 Re-record comparison (PLAN.md Section 6). Owner: Track D.
// Purpose: Summarise what improved between two attempts (nice-to-have).
// Output: P9ReRecordCompareOutputSchema in lib/schemas/prompts.ts. Suggested tier: "fast".
import { LlmError } from "../errors.ts";
import type { RenderedPrompt } from "../types.ts";

// TODO: replace with the real input shape. Planned input: Both attempts’ scores and transcripts.
export type P9Input = unknown;

// TODO: write the system prompt and user parts.
export function p9ReRecordCompare(_input: P9Input): RenderedPrompt {
  throw new LlmError("not_implemented", "p9-rerecord-compare", "Prompt template not written yet");
}
