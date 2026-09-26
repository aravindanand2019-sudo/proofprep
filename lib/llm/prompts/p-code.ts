// P-CODE AI code review (mock interview round 2). v1. Reviews code; does NOT execute it.
import type { RenderedPrompt } from "../types.ts";
import { block, text, UNTRUSTED } from "./shared.ts";

export type PCodeInput = {
  problem: {
    title: string;
    statement: string;
    constraints: string[];
    examples: Array<{ input: string; output: string }>;
  };
  language: string;
  code: string;
};

const SYSTEM = `You review a candidate's solution in a coding interview. You cannot run code: reason about it by tracing the examples and edge cases by hand.
- likelyCorrect: true only if it would pass the examples and the constraints' edge cases.
- issues: concrete bugs or problems, each with the 1-based line number (null if not line-specific). Empty if none.
- timeComplexity / spaceComplexity: Big-O of the submitted code, e.g. "O(n)".
- edgeCasesMissed: specific inputs it gets wrong or doesn't handle.
- score 0–10: 10 = correct and optimal; 7–8 = correct but suboptimal; 4–6 = right idea with bugs; 0–3 = wrong approach or empty.
- hint: one nudge toward the fix without giving the full solution.
${UNTRUSTED}`;

export function pCode(input: PCodeInput): RenderedPrompt {
  const numbered = input.code
    .split("\n")
    .map((line, i) => `${String(i + 1).padStart(3)} | ${line}`)
    .join("\n");
  return text(
    SYSTEM,
    block("problem", input.problem),
    block(`code language="${input.language}"`, numbered.slice(0, 15000)),
  );
}
