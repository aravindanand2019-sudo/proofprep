// P7 Answer evaluator (PLAN.md Section 6). v1. One call per finished session.
import type { RenderedPrompt } from "../types.ts";
import { block, text, UNTRUSTED } from "./shared.ts";

export type P7Input = {
  project: {
    name: string;
    summary: string;
    claims: Array<{ id: string; text: string; verdict: string }>;
  };
  turns: Array<{ question: string; intent: string; answer: string }>;
};

const SYSTEM = `You grade a student's answers in a project-defense interview.
For each turn (index = its 0-based position) score 0–5:
- correctness: technically right and consistent with the project evidence.
- depth: explains how and why, names specifics (files, trade-offs, numbers), not buzzwords.
- clarity: structured and easy to follow.
List concrete strengths and gaps (each under 20 words), and an idealOutline of 3–5 bullet points a strong answer would cover.
skillEvidence: usually an empty array.
claimVerdictUpdate: if the answer convincingly supports or undermines a claim, give that claimId and the new verdict; otherwise both null.
overall.score (0–5) weighs correctness most. overall strengths and gaps: 2–4 items each, actionable.
Be honest: a vague answer scores 1–2 even if polite. Never reward confident-sounding answers that dodge the question.
${UNTRUSTED}`;

export function p7AnswerEvaluator(input: P7Input): RenderedPrompt {
  return text(SYSTEM, block("project", input.project), block("turns", input.turns));
}
