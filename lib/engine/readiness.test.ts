import { describe, expect, it } from "vitest";
import { companies } from "../../data/seed/companies.ts";
import { skills } from "../../data/seed/skills.ts";
import type { Company } from "../schemas/index.ts";
import {
  categoryScore,
  componentConfidence,
  computeReadiness,
  overallConfidence,
  projectScore,
  projectsScore,
  scoreFromComponents,
  type ReadinessInput,
} from "./readiness.ts";

function company(id: string): Company {
  const found = companies.find((c) => c.id === id);
  if (!found) throw new Error(`missing company ${id}`);
  return found;
}

// PLAN.md Section 5 worked example.
const WORKED = { aptitude: 63, dsa: 48, cs: 60, projects: 30, communication: 54 };

const EMPTY: ReadinessInput = {
  skills,
  mastery: {},
  categoryAttempts: { aptitude: 0, dsa: 0, cs: 0 },
  projects: [],
  commOveralls: [],
};

describe("scoreFromComponents (worked example)", () => {
  it("TCS scores 91.7 and is Ready", () => {
    const { score, breakdown } = scoreFromComponents(company("tcs-nqt"), WORKED);
    expect(score).toBeCloseTo(91.7, 6);
    expect(breakdown.label).toBe("Ready");
  });

  it("Amazon scores 69.95 (PLAN.md prints 69.9) with DSA as the biggest lever", () => {
    const { score, breakdown } = scoreFromComponents(company("amazon-sde"), WORKED);
    expect(score).toBeCloseTo(69.9505, 3);
    expect(breakdown.label).toBe("Close");
    expect(breakdown.biggestLever).toBe("dsa");
    expect(breakdown.missing.dsa).toBeCloseTo(18, 6);
  });

  it("contributions sum to the score", () => {
    const { score, breakdown } = scoreFromComponents(company("amazon-sde"), WORKED);
    const sum = Object.values(breakdown.contributions).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(score, 9);
  });

  it("gives no extra credit above the bar", () => {
    const over = { aptitude: 100, dsa: 100, cs: 100, projects: 100, communication: 100 };
    const { score, breakdown } = scoreFromComponents(company("microsoft"), over);
    expect(score).toBeCloseTo(100, 9);
    expect(breakdown.biggestLever).toBeNull();
  });
});

describe("no data", () => {
  it("scores 0 with low confidence everywhere", () => {
    const report = computeReadiness(company("zoho"), EMPTY);
    expect(report.score).toBe(0);
    expect(report.confidence).toBe("low");
    expect(Object.values(report.components).every((v) => v === 0)).toBe(true);
    expect(report.breakdown.label).toBe("Building");
  });
});

describe("categoryScore", () => {
  it("weights mastery by skillImportance and ignores unattempted skills", () => {
    // TCS: apt-arithmetic importance 3, apt-verbal importance 3.
    const s = categoryScore("aptitude", company("tcs-nqt"), skills, {
      "apt-arithmetic": 1,
      "apt-verbal": 0.5,
    });
    expect(s).toBeCloseTo(75, 9);
  });

  it("defaults importance to 1", () => {
    // Amazon lists no aptitude skills.
    const s = categoryScore("aptitude", company("amazon-sde"), skills, {
      "apt-arithmetic": 0.8,
      "apt-logical": 0.4,
    });
    expect(s).toBeCloseTo(60, 9);
  });
});

describe("projects", () => {
  it("scores claims plus defense", () => {
    expect(projectScore({ supported: 2, partial: 2, totalClaims: 4, defenseScore: 3 })).toBeCloseTo(
      37.5 + 30,
      9,
    );
  });

  it("treats zero claims and no defense as 0", () => {
    expect(projectScore({ supported: 0, partial: 0, totalClaims: 0, defenseScore: null })).toBe(0);
  });

  it("averages the top 2 projects", () => {
    const s = projectsScore([
      { supported: 1, partial: 0, totalClaims: 1, defenseScore: null }, // 50
      { supported: 0, partial: 0, totalClaims: 2, defenseScore: null }, // 0
      { supported: 1, partial: 0, totalClaims: 1, defenseScore: 5 }, // 100
    ]);
    expect(s).toBeCloseTo(75, 9);
  });

  it("is 0 with no projects", () => {
    expect(projectsScore([])).toBe(0);
  });
});

describe("confidence", () => {
  it("uses attempt thresholds 6 and 10", () => {
    const c = componentConfidence({
      ...EMPTY,
      categoryAttempts: { aptitude: 5, dsa: 6, cs: 10 },
    });
    expect([c.aptitude, c.dsa, c.cs]).toEqual(["low", "medium", "high"]);
  });

  it("needs a defense session for high project confidence", () => {
    const analyzed = { supported: 1, partial: 0, totalClaims: 1, defenseScore: null };
    expect(componentConfidence({ ...EMPTY, projects: [analyzed] }).projects).toBe("medium");
    expect(
      componentConfidence({ ...EMPTY, projects: [{ ...analyzed, defenseScore: 4 }] }).projects,
    ).toBe("high");
  });

  it("uses comm thresholds 1 and 3", () => {
    expect(componentConfidence({ ...EMPTY, commOveralls: [50] }).communication).toBe("medium");
    expect(componentConfidence({ ...EMPTY, commOveralls: [50, 60, 70] }).communication).toBe(
      "high",
    );
  });

  it("takes the lowest level among components weighted ≥ 0.15", () => {
    // Amazon: dsa .45, cs .20, projects .15 decide; aptitude .10 and comm .10 do not.
    const levels = {
      aptitude: "low",
      dsa: "high",
      cs: "high",
      projects: "medium",
      communication: "low",
    } as const;
    expect(overallConfidence(company("amazon-sde"), levels)).toBe("medium");
  });
});
