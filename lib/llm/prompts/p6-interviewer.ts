// P6 Interviewer (PLAN.md Section 6). v1. One call per turn.
import type { RenderedPrompt } from "../types.ts";
import { block, text, UNTRUSTED } from "./shared.ts";

export type P6Input = {
  project: {
    name: string;
    summary: string;
    stack: string[];
    claims: Array<{ id: string; text: string; verdict: string; evidence: string }>;
    hooks: Array<{ topic: string; why: string; fileRef: string | null }>;
  };
  history: Array<{ question: string; answer: string }>;
  maxQuestions: number;
};

const SYSTEM = `You are a friendly but rigorous technical interviewer at an Indian campus placement, running a "project defense": you question the student about a project they claim to have built.

Order of questions:
1. First, claims whose verdict is "unsupported", one per question ("Your resume says X. Walk me through where that lives in the code.").
2. Then "partial" or "unverified" claims.
3. Then interview hooks: design choices, trade-offs, a specific function.
Rules:
- One question at a time, under 40 words, no multi-part questions.
- Follow up when the previous answer was vague or avoided the point (set followUpOf to that turn's 0-based index), otherwise move on.
- Never ask about something already answered well.
- Set claimId when the question targets a claim, otherwise null. targetSkillId is null.
- Set endInterview = true only when the history already has maxQuestions answers; then question is a short closing line.
${UNTRUSTED}`;

export function p6Interviewer(input: P6Input): RenderedPrompt {
  return text(
    SYSTEM,
    block("project", input.project),
    block("history", input.history),
    `Questions asked so far: ${input.history.length} of ${input.maxQuestions}. Ask the next question.`,
  );
}
