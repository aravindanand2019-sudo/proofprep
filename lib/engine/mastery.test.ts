import { describe, expect, it } from "vitest";
import {
  alphaFor,
  applyAttempt,
  CARELESS_OUTCOME,
  emptySkillState,
  INITIAL_MASTERY,
  type AttemptForMastery,
} from "./mastery.ts";

const AT = new Date("2026-09-26T10:00:00Z");
const CORRECT: AttemptForMastery = {
  isCorrect: true,
  difficulty: 2,
  level: "concept",
  confidence: "likely",
  mistakeType: null,
  overconfident: false,
  at: AT,
};

describe("alphaFor", () => {
  it("is 0.15 + 0.05 × difficulty", () => {
    expect(alphaFor(1)).toBeCloseTo(0.2, 9);
    expect(alphaFor(5)).toBeCloseTo(0.4, 9);
  });
});

describe("applyAttempt", () => {
  it("starts from the prior and moves toward 1 on a correct answer", () => {
    const s = applyAttempt(null, CORRECT);
    expect(s.mastery).toBeCloseTo(INITIAL_MASTERY + 0.25 * (1 - INITIAL_MASTERY), 9);
    expect(s.attempts).toBe(1);
    expect(s.correct).toBe(1);
    expect(s.lastPracticedAt).toEqual(AT);
  });

  it("moves toward 0 on a concept mistake", () => {
    const s = applyAttempt(null, { ...CORRECT, isCorrect: false, mistakeType: "concept" });
    expect(s.mastery).toBeCloseTo(0.5 - 0.25 * 0.5, 9);
    expect(s.mistakeCounts.concept).toBe(1);
  });

  it("treats a careless mistake as outcome 0.6", () => {
    const s = applyAttempt(null, { ...CORRECT, isCorrect: false, mistakeType: "careless" });
    expect(s.mastery).toBeCloseTo(0.5 + 0.25 * (CARELESS_OUTCOME - 0.5), 9);
    expect(s.mistakeCounts.careless).toBe(1);
  });

  it("treats an unclassified wrong answer as outcome 0", () => {
    const s = applyAttempt(null, { ...CORRECT, isCorrect: false });
    expect(s.mastery).toBeCloseTo(0.375, 9);
    expect(Object.values(s.mistakeCounts).every((n) => n === 0)).toBe(true);
  });

  it("updates levelStats for the question's level only", () => {
    let s = applyAttempt(null, CORRECT);
    s = applyAttempt(s, { ...CORRECT, level: "application", isCorrect: false });
    expect(s.levelStats.concept).toEqual({ attempts: 1, correct: 1 });
    expect(s.levelStats.application).toEqual({ attempts: 1, correct: 0 });
  });

  it("tracks calibration and overconfidence", () => {
    let s = applyAttempt(null, { ...CORRECT, confidence: "sure" });
    s = applyAttempt(s, {
      ...CORRECT,
      confidence: "sure",
      isCorrect: false,
      mistakeType: "concept",
      overconfident: true,
    });
    expect(s.calibration).toEqual({ sureCorrect: 1, sureWrong: 1 });
    expect(s.mistakeCounts.overconfident).toBe(1);
  });

  it("does not mutate the previous state", () => {
    const prev = emptySkillState();
    applyAttempt(prev, CORRECT);
    expect(prev).toEqual(emptySkillState());
  });

  it("stays within [0, 1]", () => {
    let s = emptySkillState();
    for (let i = 0; i < 50; i += 1) s = applyAttempt(s, { ...CORRECT, difficulty: 5 });
    expect(s.mastery).toBeLessThanOrEqual(1);
    expect(s.mastery).toBeGreaterThan(0.99);
  });
});
