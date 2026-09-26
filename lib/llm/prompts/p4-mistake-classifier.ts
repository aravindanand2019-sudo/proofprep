// P4 Mistake classifier (PLAN.md Section 6). v1. Only ambiguous items reach this prompt;
// rules in lib/engine/classifierRules.ts handle the clear cases.
import type { RenderedPrompt } from "../types.ts";
import { block, text } from "./shared.ts";

export type P4Item = {
  attemptId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  chosenAnswer: string | null;
  distractorTag: string | null;
  confidence: "sure" | "likely" | "guess" | null;
  /** time taken ÷ expected time */
  timeRatio: number;
  skill: string;
  skillMastery: number;
  conceptAccuracy: number | null;
  questionLevel: "concept" | "application";
};

export type P4Input = { items: P4Item[] };

const SYSTEM = `You diagnose why a student got placement-prep questions wrong. For each item, choose one primaryType:
- "concept": they don't know or misunderstand the underlying idea (typical: low mastery, chose a misconception, or wrong in a way that shows a wrong mental model).
- "application": they know the idea but failed to apply it in a multi-step or unfamiliar setting (typical: question level "application", decent concept accuracy).
- "careless": they likely knew it but slipped: arithmetic error, misread, rushed (typical: fast answer, off-by-one option, high mastery).
Set overconfident = true only when confidence is "sure".
agreesWithRule is always null here (no rule fired for these items).
explanation: at most 2 sentences, addressed to the student ("You…"), specific to this question, kind and direct.
conceptToRevisit: the precise idea to review (e.g. "harmonic mean for average speed").
fixAction: one concrete next step (e.g. "Do 5 timed average-speed questions, writing total distance ÷ total time each time").`;

export function p4MistakeClassifier(input: P4Input): RenderedPrompt {
  return text(SYSTEM, block("items", input.items));
}
