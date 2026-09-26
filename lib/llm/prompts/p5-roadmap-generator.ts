// P5 Roadmap generator (PLAN.md Section 6). v1. Code computes the budget; the model only
// sequences and names tasks. Output: P5RoadmapGeneratorOutputSchema.
import type { RenderedPrompt } from "../types.ts";
import { block, text } from "./shared.ts";

export type P5BudgetItem = {
  skillId: string;
  skillName: string;
  category: string;
  minutesPerDay: number;
  /** Task kind code derived from the dominant mistake type. */
  kind: string;
  targetsMistakeType: string | null;
  reason: string;
};

export type P5Input = {
  targetRole: string;
  companies: string[];
  daysLeft: number;
  hoursPerDay: number;
  budget: P5BudgetItem[];
};

const SYSTEM = `You turn a pre-computed study budget into a 2-week placement-prep plan.
Hard rules:
- Use ONLY the skillIds given in the budget, and keep each task's "kind" and "targetsMistakeType" exactly as given for that skill.
- Kinds: learn (concept gap), drill (mixed drill for application gaps), timed_drill (careless slips), calibration (overconfidence: justify each answer before submitting).
- Per day, the sum of estMinutes must not exceed hoursPerDay × 60. Tasks are 15–60 minutes.
- Spread each skill's minutesPerDay across days; the highest-budget skills appear most often. Put learn tasks before drills of the same skill.
- day is 1–7 within each week; produce weeks 1 and 2.
- title: short and specific, e.g. "Coding practice: two pointers, 8 timed questions (30 min)".
- rationale: 2–3 sentences to the student on why the plan looks like this.`;

export function p5RoadmapGenerator(input: P5Input): RenderedPrompt {
  return text(SYSTEM, block("student", input));
}
