// Mastery update rule (PLAN.md Section 4). Pure.
import type { Confidence, MistakeType, QuestionLevel, SkillState } from "../schemas/index.ts";

/** Prior for a skill with no attempts yet. Not specified in PLAN.md; see README. */
export const INITIAL_MASTERY = 0.5;
/** A careless slip is a consistency problem, not a knowledge gap. */
export const CARELESS_OUTCOME = 0.6;

export function alphaFor(difficulty: number): number {
  return 0.15 + 0.05 * difficulty;
}

export function outcomeFor(isCorrect: boolean, mistakeType: MistakeType | null): number {
  if (isCorrect) return 1;
  return mistakeType === "careless" ? CARELESS_OUTCOME : 0;
}

export function emptySkillState(): SkillState {
  return {
    mastery: INITIAL_MASTERY,
    attempts: 0,
    correct: 0,
    lastPracticedAt: null,
    mistakeCounts: { concept: 0, application: 0, careless: 0, overconfident: 0 },
    calibration: { sureCorrect: 0, sureWrong: 0 },
    levelStats: {
      concept: { attempts: 0, correct: 0 },
      application: { attempts: 0, correct: 0 },
    },
  };
}

export type AttemptForMastery = {
  isCorrect: boolean;
  difficulty: number;
  level: QuestionLevel;
  confidence: Confidence | null;
  /** Rule verdict for a wrong answer, if one fired. */
  mistakeType: MistakeType | null;
  overconfident: boolean;
  at: Date;
};

/** mastery ← mastery + α · (outcome − mastery), plus counters. Returns a new state. */
export function applyAttempt(state: SkillState | null, attempt: AttemptForMastery): SkillState {
  const prev = state ?? emptySkillState();
  const outcome = outcomeFor(attempt.isCorrect, attempt.mistakeType);
  const mastery = prev.mastery + alphaFor(attempt.difficulty) * (outcome - prev.mastery);
  const level = prev.levelStats[attempt.level];
  const wrongType = attempt.isCorrect ? null : attempt.mistakeType;

  return {
    mastery: Math.min(1, Math.max(0, mastery)),
    attempts: prev.attempts + 1,
    correct: prev.correct + (attempt.isCorrect ? 1 : 0),
    lastPracticedAt: attempt.at,
    mistakeCounts: {
      concept: prev.mistakeCounts.concept + (wrongType === "concept" ? 1 : 0),
      application: prev.mistakeCounts.application + (wrongType === "application" ? 1 : 0),
      careless: prev.mistakeCounts.careless + (wrongType === "careless" ? 1 : 0),
      overconfident:
        prev.mistakeCounts.overconfident + (!attempt.isCorrect && attempt.overconfident ? 1 : 0),
    },
    calibration: {
      sureCorrect:
        prev.calibration.sureCorrect + (attempt.confidence === "sure" && attempt.isCorrect ? 1 : 0),
      sureWrong:
        prev.calibration.sureWrong + (attempt.confidence === "sure" && !attempt.isCorrect ? 1 : 0),
    },
    levelStats: {
      ...prev.levelStats,
      [attempt.level]: {
        attempts: level.attempts + 1,
        correct: level.correct + (attempt.isCorrect ? 1 : 0),
      },
    },
  };
}
