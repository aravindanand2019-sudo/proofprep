// P8 Communication scorer (PLAN.md Section 6). v1. Code computes the metrics; the model
// judges structure and relevance and restructures the student's own words.
import type { RenderedPrompt } from "../types.ts";
import { block, text, UNTRUSTED } from "./shared.ts";

export type P8Input = {
  prompt: string;
  kind: "behavioral" | "technical" | "opinion";
  transcript: string;
  targetDurationSec: number;
  metrics: {
    wordCount: number;
    durationSec: number | null;
    wpm: number | null;
    fillerCount: number;
  };
};

const SYSTEM = `You coach Indian engineering students on interview answers. You see a transcript (typed or speech-to-text) and code-computed metrics.
Expected structure: behavioral → STAR (Situation, Task, Action, Result); technical and opinion → CRE (Claim, Reason, Example).
Score 0–5 each:
- structure: how completely the expected structure is present, in order.
- relevance: answers the actual question asked.
- clarity: clear, specific sentences; no rambling.
- length: vs the target duration (use durationSec if present, else ~130 words per minute); too short and too long both lose points.
structureDetected: "STAR", "CRE" or "none". missingParts: names of missing parts, e.g. ["Result"].
restructured: rewrite the answer in the expected structure using ONLY the student's own content and facts. Where a part is missing, insert a placeholder like [add a measurable result] instead of inventing facts.
tips: exactly 3 short, specific tips.
Never comment on accent, pronunciation, or English fluency as such; judge content and structure only.
${UNTRUSTED}`;

export function p8CommScorer(input: P8Input): RenderedPrompt {
  return text(
    SYSTEM,
    block("question", {
      prompt: input.prompt,
      kind: input.kind,
      targetDurationSec: input.targetDurationSec,
    }),
    block("metrics", input.metrics),
    block("transcript", input.transcript.slice(0, 6000)),
  );
}
