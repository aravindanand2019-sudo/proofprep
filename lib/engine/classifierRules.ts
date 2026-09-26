// P4 rules (PLAN.md Section 6), run before any LLM call. Pure.
import type { Confidence, LevelStat, MistakeType, QuestionLevel } from "../schemas/index.ts";

export const CARELESS_TIME_RATIO = 0.4;
export const CARELESS_MASTERY = 0.7;
export const CONCEPT_MASTERY = 0.5;
export const APPLICATION_CONCEPT_ACCURACY = 0.7;

export type MistakeSignalsInput = {
  /** timeTakenSec / question.expectedTimeSec */
  timeRatio: number;
  confidence: Confidence | null;
  /** Tag on the chosen option: "misconception:<id>", "slip", or null if untagged. */
  distractorTag: string | null;
  /** Skill mastery before this attempt. */
  skillMastery: number;
  questionLevel: QuestionLevel;
  /** The student's concept-level record on this skill, before this attempt. */
  conceptStats: LevelStat;
};

export type RuleVerdict = {
  primaryType: MistakeType;
  /** Which rule fired, for the "why we think so" UI. */
  reason: string;
};

/** Overconfidence is a flag, not a type; it needs a recorded confidence. */
export function isOverconfident(confidence: Confidence | null): boolean {
  return confidence === "sure";
}

/**
 * Classifies a wrong answer. Rules are tried in PLAN.md order: careless, concept,
 * application. Returns null when none fires; the item then goes to the LLM (P4).
 */
export function classifyByRules(s: MistakeSignalsInput): RuleVerdict | null {
  if (s.timeRatio < CARELESS_TIME_RATIO) {
    return { primaryType: "careless", reason: "Answered in under 40% of the expected time" };
  }
  if (s.skillMastery >= CARELESS_MASTERY && s.distractorTag === "slip") {
    return { primaryType: "careless", reason: "Strong on this skill but chose a slip-trap option" };
  }
  if (s.distractorTag?.startsWith("misconception:") && s.skillMastery < CONCEPT_MASTERY) {
    return {
      primaryType: "concept",
      reason: `Chose an option that reflects a known misconception (${s.distractorTag.slice(14)})`,
    };
  }
  const { attempts, correct } = s.conceptStats;
  if (
    s.questionLevel === "application" &&
    attempts > 0 &&
    correct / attempts >= APPLICATION_CONCEPT_ACCURACY
  ) {
    return {
      primaryType: "application",
      reason: "Gets concept questions on this skill right but missed an applied one",
    };
  }
  return null;
}
