// Question selection and the public (answer-free) question shape.
import {
  getAttempts,
  getCompanies,
  getMistakes,
  getQuestions,
  getSkillStates,
  getUserDoc,
} from "@/lib/data";
import { DOMAIN_LABELS, domainFor } from "@/lib/domains";
import {
  PublicQuestionSchema,
  type Domain,
  type PublicQuestion,
  type Question,
  type WithId,
} from "@/lib/schemas";

export type PublicQuestionWithId = PublicQuestion & { id: string };

export function toPublic(q: WithId<Question>): PublicQuestionWithId {
  return { id: q.id, ...PublicQuestionSchema.parse(q) };
}

export const PRACTICE_SET_SIZE = 10;
export const PATTERN_QUESTIONS = 4;
const MAX_PER_SKILL = 2;

export type PracticeSections = {
  domain: Domain;
  domainLabel: string;
  patterns: WithId<Question>[];
  weak: WithId<Question>[];
};

/**
 * A 10-question set: 4 coding-pattern questions for the user's domain, then 6 from the
 * weakest skills and open mistakes. Questions answered correctly recently go last.
 */
export async function pickPracticeSections(uid: string): Promise<PracticeSections> {
  const [all, states, open, user, companies, attempts] = await Promise.all([
    getQuestions(),
    getSkillStates(uid),
    getMistakes(uid, { openOnly: true }),
    getUserDoc(uid),
    getCompanies(),
    getAttempts(uid, 300),
  ]);
  const targets = user?.profile.targetCompanies ?? [];
  const domain = domainFor(
    user?.profile.targetRole,
    companies.filter((c) => targets.includes(c.id)),
  );

  const openBySkill = new Map<string, number>();
  for (const m of open) openBySkill.set(m.skillId, (openBySkill.get(m.skillId) ?? 0) + 1);
  const recentlyCorrect = new Set(attempts.filter((a) => a.isCorrect).map((a) => a.questionId));

  const weakness = (q: WithId<Question>) =>
    (openBySkill.get(q.skillId) ?? 0) * 0.2 +
    (1 - (states[q.skillId]?.mastery ?? 0.55)) -
    (recentlyCorrect.has(q.id) ? 1 : 0);
  const byWeakness = (a: WithId<Question>, b: WithId<Question>) => {
    const diff = weakness(b) - weakness(a);
    if (Math.abs(diff) > 1e-9) return diff;
    return (a.pool === "practice" ? 0 : 1) - (b.pool === "practice" ? 0 : 1);
  };

  const perSkill = new Map<string, number>();
  const take = (pool: WithId<Question>[], count: number): WithId<Question>[] => {
    const picked: WithId<Question>[] = [];
    for (const q of [...pool].sort(byWeakness)) {
      if (picked.length >= count) break;
      const n = perSkill.get(q.skillId) ?? 0;
      if (n >= MAX_PER_SKILL) continue;
      perSkill.set(q.skillId, n + 1);
      picked.push(q);
    }
    return picked;
  };

  const patterns = take(
    all.filter((q) => q.pattern && q.domains?.includes(domain)),
    PATTERN_QUESTIONS,
  );
  const chosen = new Set(patterns.map((q) => q.id));
  const weak = take(
    all.filter((q) => !chosen.has(q.id) && !q.pattern),
    PRACTICE_SET_SIZE - patterns.length,
  );
  return { domain, domainLabel: DOMAIN_LABELS[domain], patterns, weak };
}

/** Flat list of the same set (used by scripts and tests). */
export async function pickPracticeSet(uid: string): Promise<WithId<Question>[]> {
  const { patterns, weak } = await pickPracticeSections(uid);
  return [...patterns, ...weak];
}
