// Company profiles (PLAN.md Section 5). Weights and bars are copied exactly from the plan.
// skillImportance and rounds are PROPOSED (not in the plan); unlisted skills count as 1.
import {
  type Company,
  type ComponentWeights,
  WEIGHT_SUM_TOLERANCE,
  type WithId,
} from "../../lib/schemas/index.ts";

export const companies: WithId<Company>[] = [
  {
    id: "tcs-nqt",
    name: "TCS NQT",
    tier: "service",
    weights: { aptitude: 0.35, dsa: 0.2, cs: 0.2, projects: 0.1, communication: 0.15 },
    bars: { aptitude: 70, dsa: 50, cs: 55, projects: 40, communication: 60 },
    skillImportance: {
      "apt-arithmetic": 3,
      "apt-time-speed-work": 3,
      "apt-logical": 3,
      "apt-verbal": 3,
      "apt-number-systems": 2,
      "apt-pnc-probability": 2,
      "dsa-arrays-strings": 2,
      "cs-oop": 3,
      "cs-dbms-sql": 2,
      "comm-self-intro": 3,
    },
    rounds: ["NQT online test", "Technical interview", "Managerial interview", "HR interview"],
  },
  {
    id: "infosys",
    name: "Infosys",
    tier: "service",
    weights: { aptitude: 0.3, dsa: 0.25, cs: 0.2, projects: 0.1, communication: 0.15 },
    bars: { aptitude: 70, dsa: 55, cs: 55, projects: 40, communication: 60 },
    skillImportance: {
      "apt-logical": 3,
      "apt-verbal": 3,
      "apt-arithmetic": 2,
      "apt-pnc-probability": 2,
      "dsa-arrays-strings": 2,
      "dsa-dynamic-programming": 2,
      "cs-oop": 2,
      "cs-dbms-sql": 2,
      "comm-self-intro": 3,
    },
    rounds: ["Online assessment", "Technical interview", "HR interview"],
  },
  {
    id: "zoho",
    name: "Zoho",
    tier: "product",
    weights: { aptitude: 0.2, dsa: 0.4, cs: 0.15, projects: 0.15, communication: 0.1 },
    bars: { aptitude: 65, dsa: 75, cs: 60, projects: 55, communication: 55 },
    skillImportance: {
      "dsa-arrays-strings": 3,
      "dsa-recursion-backtracking": 3,
      "dsa-two-pointers-window": 2,
      "dsa-sorting-searching": 2,
      "dsa-linked-lists": 2,
      "apt-logical": 3,
      "apt-arithmetic": 2,
      "cs-oop": 3,
      "cs-dbms-sql": 2,
      "comm-project-walkthrough": 2,
    },
    rounds: [
      "Written aptitude + C output",
      "Basic programming",
      "Advanced programming",
      "Technical interview",
      "HR interview",
    ],
  },
  {
    id: "amazon-sde",
    name: "Amazon SDE",
    tier: "product",
    weights: { aptitude: 0.1, dsa: 0.45, cs: 0.2, projects: 0.15, communication: 0.1 },
    bars: { aptitude: 60, dsa: 80, cs: 70, projects: 60, communication: 65 },
    skillImportance: {
      "dsa-complexity": 3,
      "dsa-arrays-strings": 3,
      "dsa-hashing": 3,
      "dsa-trees": 3,
      "dsa-graphs": 3,
      "dsa-dynamic-programming": 3,
      "dsa-two-pointers-window": 2,
      "cs-os-processes": 2,
      "cs-oop": 2,
      "comm-behavioral-star": 3,
      "comm-project-walkthrough": 2,
    },
    rounds: [
      "Online assessment",
      "DSA interview 1",
      "DSA interview 2",
      "Bar raiser (DSA + leadership principles)",
    ],
  },
  {
    id: "microsoft",
    name: "Microsoft",
    tier: "product",
    weights: { aptitude: 0.05, dsa: 0.45, cs: 0.2, projects: 0.15, communication: 0.15 },
    bars: { aptitude: 60, dsa: 85, cs: 70, projects: 65, communication: 70 },
    skillImportance: {
      "dsa-arrays-strings": 3,
      "dsa-trees": 3,
      "dsa-graphs": 3,
      "dsa-dynamic-programming": 3,
      "dsa-recursion-backtracking": 3,
      "dsa-linked-lists": 2,
      "cs-oop": 3,
      "cs-os-processes": 2,
      "cs-dbms-design": 2,
      "comm-technical-explanation": 3,
      "comm-project-walkthrough": 3,
    },
    rounds: ["Online assessment", "Technical interview x3", "AA / hiring manager interview"],
  },
];

function weightSum(w: ComponentWeights): number {
  return w.aptitude + w.dsa + w.cs + w.projects + w.communication;
}

// Fail fast at import time if anyone edits a weight and breaks the sum.
for (const company of companies) {
  const sum = weightSum(company.weights);
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    throw new Error(`Company "${company.id}" weights sum to ${sum}, expected 1`);
  }
}
