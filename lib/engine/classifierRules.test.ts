import { describe, expect, it } from "vitest";
import { classifyByRules, isOverconfident, type MistakeSignalsInput } from "./classifierRules.ts";

const BASE: MistakeSignalsInput = {
  timeRatio: 1,
  confidence: "likely",
  distractorTag: null,
  skillMastery: 0.6,
  questionLevel: "concept",
  conceptStats: { attempts: 0, correct: 0 },
};

describe("classifyByRules", () => {
  it("careless: answered too fast", () => {
    expect(classifyByRules({ ...BASE, timeRatio: 0.3 })?.primaryType).toBe("careless");
  });

  it("careless: strong skill + slip trap", () => {
    expect(
      classifyByRules({ ...BASE, skillMastery: 0.75, distractorTag: "slip" })?.primaryType,
    ).toBe("careless");
  });

  it("slip trap alone is not careless when mastery is below 0.7", () => {
    expect(classifyByRules({ ...BASE, skillMastery: 0.69, distractorTag: "slip" })).toBeNull();
  });

  it("concept: misconception distractor + low mastery", () => {
    const v = classifyByRules({
      ...BASE,
      skillMastery: 0.3,
      distractorTag: "misconception:off_by_one",
    });
    expect(v?.primaryType).toBe("concept");
    expect(v?.reason).toContain("off_by_one");
  });

  it("misconception with mastery ≥ 0.5 does not fire the concept rule", () => {
    expect(
      classifyByRules({ ...BASE, skillMastery: 0.5, distractorTag: "misconception:x" }),
    ).toBeNull();
  });

  it("application: applied question, ≥ 70% concept accuracy", () => {
    const v = classifyByRules({
      ...BASE,
      questionLevel: "application",
      conceptStats: { attempts: 10, correct: 7 },
    });
    expect(v?.primaryType).toBe("application");
  });

  it("application needs concept history", () => {
    expect(classifyByRules({ ...BASE, questionLevel: "application" })).toBeNull();
    expect(
      classifyByRules({
        ...BASE,
        questionLevel: "application",
        conceptStats: { attempts: 10, correct: 6 },
      }),
    ).toBeNull();
  });

  it("careless wins over concept (PLAN.md rule order)", () => {
    expect(
      classifyByRules({
        ...BASE,
        timeRatio: 0.2,
        skillMastery: 0.1,
        distractorTag: "misconception:x",
      })?.primaryType,
    ).toBe("careless");
  });

  it("returns null when nothing fires", () => {
    expect(classifyByRules(BASE)).toBeNull();
  });
});

describe("isOverconfident", () => {
  it("only for a recorded 'sure'", () => {
    expect(isOverconfident("sure")).toBe(true);
    expect(isOverconfident("likely")).toBe(false);
    expect(isOverconfident(null)).toBe(false);
  });
});
