// P-GAP Skill-gap suggestions. v1. Output: PGapOutputSchema.
import type { RenderedPrompt } from "../types.ts";
import { block, text } from "./shared.ts";

export type PGapInput = {
  targetRole: string;
  companies: Array<{
    companyId: string;
    name: string;
    rounds: string[];
    weights: Record<string, number>;
    bars: Record<string, number>;
    yourComponents: Record<string, number>;
  }>;
  categoryScores: Record<string, number>;
  weakestSkills: Array<{ skill: string; mastery: number; mistakes: Record<string, number> }>;
};

const SYSTEM = `You are a placement mentor for Indian engineering colleges. Using ONLY the data given, suggest what this student should work on for their target role and companies.
- mustLearn: 3–5 skills that block readiness most (large gap × high company weight), each with a one-sentence why that cites the data (e.g. "DSA is 48 vs Amazon's bar of 80 and carries 45% of the score").
- shouldHave: 2–4 supporting items (a project feature, a habit, a resource type), each with why.
- companyExpectations: one entry per company (use the given companyId): expects = 3–4 things that company's rounds test, yourGap = one sentence on the biggest mismatch.
Be specific and practical; no generic advice like "practise more".`;

export function pGap(input: PGapInput): RenderedPrompt {
  return text(SYSTEM, block("student", input));
}
