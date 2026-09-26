// Daily coding: picks today's problems and records submissions (mastery + readiness).
import {
  getCodingSubmissions,
  getCompanies,
  getPracticeProblems,
  getSkillStates,
  getUserDoc,
  saveCodingSubmission,
  saveSkillStates,
} from "@/lib/data";
import { DOMAIN_LABELS, domainFor } from "@/lib/domains";
import { applyAttempt } from "@/lib/engine/mastery";
import {
  PCodeOutputSchema,
  type CodeLanguage,
  type Domain,
  type PCodeOutput,
  type PracticeProblem,
  type WithId,
} from "@/lib/schemas";
import { HttpError } from "./api";
import { tryLlm } from "./llm";
import { recordSnapshots } from "./readiness";

export const DAILY_COUNT = 3;
const DIFFICULTY_RANK = { Easy: 1, Medium: 2, Hard: 3 } as const;

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

export type DailyCoding = {
  domain: Domain;
  domainLabel: string;
  date: string;
  today: WithId<PracticeProblem>[];
  all: WithId<PracticeProblem>[];
  solved: string[];
  attempted: string[];
};

/**
 * Today's 3 problems for the user's domain: stable for the whole day, unsolved first,
 * weakest skills first. Service domain gets 2 Easy + 1 Medium; others 1 Easy + 2 Medium+.
 */
export async function getDailyCoding(uid: string, now = new Date()): Promise<DailyCoding> {
  const [problems, user, companies, states, submissions] = await Promise.all([
    getPracticeProblems(),
    getUserDoc(uid),
    getCompanies(),
    getSkillStates(uid),
    getCodingSubmissions(uid),
  ]);
  const targets = user?.profile.targetCompanies ?? [];
  const domain = domainFor(
    user?.profile.targetRole,
    companies.filter((c) => targets.includes(c.id)),
  );
  const date = now.toISOString().slice(0, 10);
  const solved = new Set(submissions.filter((s) => s.solved).map((s) => s.problemId));
  const attempted = new Set(submissions.map((s) => s.problemId));

  const inDomain = problems.filter((p) => p.domains.includes(domain));
  const rank = (p: WithId<PracticeProblem>) =>
    (solved.has(p.id) ? 10 : 0) +
    (states[p.skillId]?.mastery ?? 0.5) +
    (hash(`${uid}:${date}:${p.id}`) % 1000) / 2000;
  const ordered = [...inDomain].sort((a, b) => rank(a) - rank(b));

  const easyWanted = domain === "service" ? 2 : 1;
  const easy = ordered.filter((p) => p.difficulty === "Easy").slice(0, easyWanted);
  const harder = ordered.filter((p) => p.difficulty !== "Easy").slice(0, DAILY_COUNT - easy.length);
  const today = [...easy, ...harder];
  for (const p of ordered) {
    if (today.length >= DAILY_COUNT) break;
    if (!today.includes(p)) today.push(p);
  }
  today.sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);

  const all = [...problems].sort(
    (a, b) =>
      Number(!a.domains.includes(domain)) - Number(!b.domains.includes(domain)) ||
      DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] ||
      a.title.localeCompare(b.title),
  );
  return {
    domain,
    domainLabel: DOMAIN_LABELS[domain],
    date,
    today,
    all,
    solved: [...solved],
    attempted: [...attempted],
  };
}

export type SubmitResult = {
  solved: boolean;
  firstSolve: boolean;
  review: PCodeOutput | null;
  reviewError: string | null;
  mastery: { before: number; after: number };
};

/**
 * Records a submission. Test results come from the browser run (Python/JavaScript);
 * C++/Java have no run, so the AI review's likelyCorrect decides "solved".
 */
export async function submitCoding(
  uid: string,
  input: {
    problemId: string;
    language: CodeLanguage;
    code: string;
    tests: { passed: number; total: number } | null;
  },
): Promise<SubmitResult> {
  const problem = (await getPracticeProblems()).find((p) => p.id === input.problemId);
  if (!problem) throw new HttpError(404, "Unknown problem.");
  if (!input.code.trim()) throw new HttpError(400, "Write some code first.");
  if (input.tests && input.tests.total !== problem.tests.length) {
    throw new HttpError(400, "Run all tests before submitting.");
  }

  const examples = problem.tests.filter((t) => t.example);
  const ai = await tryLlm(
    "p-code",
    {
      problem: {
        title: problem.title,
        statement: `${problem.statement}\nImplement ${input.language === "python" ? problem.fn : problem.fn.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())}(${problem.params.join(", ")}).`,
        constraints: problem.constraints,
        examples: examples.map((t) => ({
          input: JSON.stringify(t.args),
          output: JSON.stringify(t.expected),
        })),
      },
      language: input.language,
      code: input.code,
    },
    PCodeOutputSchema,
  );

  const solved = input.tests
    ? input.tests.passed === input.tests.total
    : ai.ok && ai.data.likelyCorrect;
  const previous = await getCodingSubmissions(uid);
  const firstSolve = solved && !previous.some((s) => s.problemId === problem.id && s.solved);

  const states = await getSkillStates(uid);
  const before = states[problem.skillId] ?? null;
  const after = applyAttempt(before, {
    isCorrect: solved,
    difficulty: DIFFICULTY_RANK[problem.difficulty] + 1,
    level: "application",
    confidence: null,
    mistakeType: null,
    overconfident: false,
    at: new Date(),
  });

  await Promise.all([
    saveCodingSubmission(uid, {
      problemId: problem.id,
      language: input.language,
      code: input.code.slice(0, 20000),
      tests: input.tests,
      solved,
      review: ai.ok ? ai.data : null,
      createdAt: new Date(),
    }),
    saveSkillStates(uid, { [problem.skillId]: after }),
  ]);
  if (firstSolve || !solved) await recordSnapshots(uid, "practice");

  return {
    solved,
    firstSolve,
    review: ai.ok ? ai.data : null,
    reviewError: ai.ok ? null : ai.error,
    mastery: { before: before?.mastery ?? 0.5, after: after.mastery },
  };
}
