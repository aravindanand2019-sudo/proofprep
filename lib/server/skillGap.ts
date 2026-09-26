// Skill Gap page data and the P-GAP suggestions call.
import {
  getLatestSkillGapReport,
  getMistakes,
  getSkills,
  getSkillStates,
  getUserDoc,
  saveSkillGapReport,
} from "@/lib/data";
import {
  PGapOutputSchema,
  type CategoryScoresValues,
  type Mistake,
  type MistakeTarget,
  type SkillGapReport,
  type WithId,
} from "@/lib/schemas";
import { HttpError } from "./api";
import { tryLlm } from "./llm";
import { computeUserReadiness, type CompanyReport } from "./readiness";

export type WeakSkill = {
  skillId: string;
  name: string;
  category: string;
  mastery: number;
  attempts: number;
  mistakes: Record<MistakeTarget, number>;
};

export type SkillGapData = {
  hasData: boolean;
  categories: CategoryScoresValues;
  overall: number;
  reports: CompanyReport[];
  weakest: WeakSkill[];
  mistakeTotals: Record<MistakeTarget, number>;
  recentMistakes: Array<WithId<Mistake> & { skillName: string }>;
  suggestions: WithId<SkillGapReport> | null;
  targetRole: string;
};

export async function loadSkillGap(uid: string): Promise<SkillGapData> {
  const [{ reports, categories }, skills, states, mistakes, suggestions, user] = await Promise.all([
    computeUserReadiness(uid),
    getSkills(),
    getSkillStates(uid),
    getMistakes(uid),
    getLatestSkillGapReport(uid),
    getUserDoc(uid),
  ]);
  const names = new Map(skills.map((s) => [s.id, s]));
  const weakest = Object.entries(states)
    .filter(([id]) => names.get(id)?.category !== "communication")
    .map(([skillId, s]) => ({
      skillId,
      name: names.get(skillId)?.name ?? skillId,
      category: names.get(skillId)?.category ?? "",
      mastery: s.mastery,
      attempts: s.attempts,
      mistakes: s.mistakeCounts,
    }))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 6);

  const mistakeTotals: Record<MistakeTarget, number> = {
    concept: 0,
    application: 0,
    careless: 0,
    overconfident: 0,
  };
  for (const m of mistakes) {
    mistakeTotals[m.primaryType] += 1;
    if (m.overconfident) mistakeTotals.overconfident += 1;
  }

  const { aptitude, dsa, communication } = categories;
  return {
    hasData: Object.keys(states).length > 0,
    categories,
    overall: (aptitude + dsa + communication) / 3,
    reports,
    weakest,
    mistakeTotals,
    recentMistakes: mistakes
      .filter((m) => !m.resolved)
      .slice(0, 8)
      .map((m) => ({ ...m, skillName: names.get(m.skillId)?.name ?? m.skillId })),
    suggestions,
    targetRole: user?.profile.targetRole ?? "Software engineer",
  };
}

export async function generateSuggestions(uid: string): Promise<WithId<SkillGapReport>> {
  const data = await loadSkillGap(uid);
  if (!data.hasData) throw new HttpError(400, "Take the Quick Assessment first.");
  const ai = await tryLlm(
    "p-gap",
    {
      targetRole: data.targetRole,
      companies: data.reports.map(({ company, report }) => ({
        companyId: company.id,
        name: company.name,
        rounds: company.rounds,
        weights: company.weights,
        bars: company.bars,
        yourComponents: report.components,
      })),
      categoryScores: data.categories,
      weakestSkills: data.weakest.map((w) => ({
        skill: w.name,
        mastery: Math.round(w.mastery * 100) / 100,
        mistakes: w.mistakes,
      })),
    },
    PGapOutputSchema,
  );
  if (!ai.ok) throw new HttpError(503, ai.error);
  const report: SkillGapReport = { ...ai.data, createdAt: new Date() };
  const id = await saveSkillGapReport(uid, report);
  return { id, ...report };
}
