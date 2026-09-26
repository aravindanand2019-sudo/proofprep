// Gathers a student's data, runs lib/engine/readiness.ts, and records snapshots.
import {
  categoryScore,
  communicationScore,
  computeReadiness,
  projectsScore,
  type ProjectEvidence,
  type ReadinessInput,
  type ReadinessReport,
} from "@/lib/engine/readiness";
import {
  getCommAttempts,
  getCompanies,
  getProjects,
  getSkills,
  getSkillStates,
  getUserDoc,
  saveCategoryScores,
  saveReadinessSnapshot,
} from "@/lib/data";
import type {
  CategoryScoresValues,
  Company,
  Project,
  ReadinessResult,
  ReadinessTrigger,
  WithId,
} from "@/lib/schemas";

const NEUTRAL_COMPANY: Company = {
  name: "neutral",
  tier: "product",
  weights: { aptitude: 0.2, dsa: 0.2, cs: 0.2, projects: 0.2, communication: 0.2 },
  bars: { aptitude: 100, dsa: 100, cs: 100, projects: 100, communication: 100 },
  skillImportance: {},
  rounds: [],
};

export function projectEvidence(project: Project): ProjectEvidence {
  const count = (verdict: string) => project.claims.filter((c) => c.verdict === verdict).length;
  return {
    supported: count("supported"),
    partial: count("partial"),
    totalClaims: project.claims.length,
    defenseScore: project.defenseScore ?? null,
  };
}

export async function loadReadinessInput(uid: string): Promise<ReadinessInput> {
  const [skills, states, projects, comm] = await Promise.all([
    getSkills(),
    getSkillStates(uid),
    getProjects(uid),
    getCommAttempts(uid, 3),
  ]);
  const category = new Map(skills.map((s) => [s.id, s.category]));
  const categoryAttempts = { aptitude: 0, dsa: 0, cs: 0 };
  const mastery: Record<string, number> = {};
  for (const [skillId, state] of Object.entries(states)) {
    mastery[skillId] = state.mastery;
    const c = category.get(skillId);
    if (c === "aptitude" || c === "dsa" || c === "cs") categoryAttempts[c] += state.attempts;
  }
  return {
    skills,
    mastery,
    categoryAttempts,
    projects: projects.map(projectEvidence),
    commOveralls: comm.map((a) => a.overall),
  };
}

export function categoryScoresFrom(input: ReadinessInput): CategoryScoresValues {
  return {
    aptitude: categoryScore("aptitude", NEUTRAL_COMPANY, input.skills, input.mastery),
    dsa: categoryScore("dsa", NEUTRAL_COMPANY, input.skills, input.mastery),
    cs: categoryScore("cs", NEUTRAL_COMPANY, input.skills, input.mastery),
    communication: communicationScore(input.commOveralls),
    projects: projectsScore(input.projects),
  };
}

export type CompanyReport = { company: WithId<Company>; report: ReadinessReport };

/** Live readiness for the user's target companies (all companies if none chosen). */
export async function computeUserReadiness(uid: string): Promise<{
  input: ReadinessInput;
  reports: CompanyReport[];
  categories: CategoryScoresValues;
}> {
  const [user, companies, input] = await Promise.all([
    getUserDoc(uid),
    getCompanies(),
    loadReadinessInput(uid),
  ]);
  const targets = user?.profile.targetCompanies ?? [];
  const chosen = targets.length > 0 ? companies.filter((c) => targets.includes(c.id)) : companies;
  chosen.sort((a, b) => targets.indexOf(a.id) - targets.indexOf(b.id));
  return {
    input,
    reports: chosen.map((company) => ({ company, report: computeReadiness(company, input) })),
    categories: categoryScoresFrom(input),
  };
}

function toResult(report: ReadinessReport): ReadinessResult {
  return { score: report.score, components: report.components, confidence: report.confidence };
}

/** Recomputes readiness and appends a readiness snapshot plus a category-score snapshot. */
export async function recordSnapshots(
  uid: string,
  trigger: ReadinessTrigger,
): Promise<{ reports: CompanyReport[]; categories: CategoryScoresValues }> {
  const { reports, categories } = await computeUserReadiness(uid);
  const createdAt = new Date();
  await Promise.all([
    saveReadinessSnapshot(uid, {
      createdAt,
      trigger,
      perCompany: Object.fromEntries(reports.map((r) => [r.company.id, toResult(r.report)])),
    }),
    saveCategoryScores(uid, { createdAt, trigger, scores: categories }),
  ]);
  return { reports, categories };
}
