// Writes the global seed collections (skills, companies, commPrompts, questions,
// codingProblems) to Firestore.
//
// Idempotent: each document is fully overwritten under a fixed ID, and documents
// no longer in the seed files are deleted, so every run converges on the same state.
//
//   npm run seed        validate, then write (needs .env.local with Firebase Admin creds)
//   npm run seed:check  validate only; no Firebase access
import type { Firestore, WriteBatch } from "firebase-admin/firestore";
import type { z } from "zod";
import { codingPatterns } from "../data/seed/codingPatterns.ts";
import { codingProblems } from "../data/seed/codingProblems.ts";
import { commPrompts } from "../data/seed/commPrompts.ts";
import { companies } from "../data/seed/companies.ts";
import { practiceProblems } from "../data/seed/practiceProblems.ts";
import { questions as baseQuestions } from "../data/seed/questions.ts";
import { skills } from "../data/seed/skills.ts";
import { getAdminDb } from "../lib/firebase/admin.ts";
import {
  CodingProblemSchema,
  CommPromptSchema,
  CompanySchema,
  PracticeProblemSchema,
  toStoredProblem,
  QuestionSchema,
  SkillSchema,
  type WithId,
} from "../lib/schemas/index.ts";

const FIRESTORE_BATCH_LIMIT = 500;
const questions = [...baseQuestions, ...codingPatterns];

type SeedCollection = {
  name: string;
  docs: WithId<Record<string, unknown>>[];
};

function validateDocs<T>(label: string, docs: WithId<T>[], schema: z.ZodType<T>): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const { id, ...data } of docs) {
    if (seen.has(id)) errors.push(`${label}/${id}: duplicate id`);
    seen.add(id);
    const result = schema.safeParse(data);
    if (!result.success) {
      errors.push(`${label}/${id}: ${result.error.issues.map((i) => i.message).join("; ")}`);
    }
  }
  return errors;
}

function findCycle(graph: Map<string, string[]>): string[] | null {
  const state = new Map<string, "visiting" | "done">();
  const path: string[] = [];

  function visit(node: string): string[] | null {
    if (state.get(node) === "done") return null;
    if (state.get(node) === "visiting") return [...path.slice(path.indexOf(node)), node];
    state.set(node, "visiting");
    path.push(node);
    for (const next of graph.get(node) ?? []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    path.pop();
    state.set(node, "done");
    return null;
  }

  for (const node of graph.keys()) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return null;
}

function validateReferences(): string[] {
  const errors: string[] = [];
  const skillIds = new Set(skills.map((s) => s.id));

  for (const skill of skills) {
    for (const prereq of skill.prerequisites) {
      if (!skillIds.has(prereq))
        errors.push(`skills/${skill.id}: unknown prerequisite "${prereq}"`);
    }
    if (skill.parentId && !skillIds.has(skill.parentId)) {
      errors.push(`skills/${skill.id}: unknown parentId "${skill.parentId}"`);
    }
  }
  for (const company of companies) {
    for (const skillId of Object.keys(company.skillImportance)) {
      if (!skillIds.has(skillId)) {
        errors.push(`companies/${company.id}: unknown skill "${skillId}" in skillImportance`);
      }
    }
  }

  for (const prompt of commPrompts) {
    if (prompt.skillId && !skillIds.has(prompt.skillId)) {
      errors.push(`commPrompts/${prompt.id}: unknown skill "${prompt.skillId}"`);
    }
  }

  for (const item of [...questions, ...codingProblems, ...practiceProblems]) {
    if (!skillIds.has(item.skillId)) errors.push(`${item.id}: unknown skill "${item.skillId}"`);
  }
  const poolCount = (pool: string, prefix: string) =>
    questions.filter((q) => q.pool === pool && q.skillId.startsWith(prefix)).length;
  for (const domain of ["sde", "fullstack", "data-ml", "service"] as const) {
    const n = codingPatterns.filter((q) => q.domains?.includes(domain)).length;
    if (n < 4) errors.push(`coding patterns for ${domain}: need at least 4, found ${n}`);
  }
  for (const p of practiceProblems) {
    if (!p.tests.some((t) => t.example)) errors.push(`${p.id}: needs at least one example test`);
    if (p.tests.some((t) => t.expected === undefined))
      errors.push(`${p.id}: a test has no expected value`);
  }
  for (const domain of ["sde", "fullstack", "data-ml", "service"] as const) {
    const n = practiceProblems.filter((p) => p.domains.includes(domain)).length;
    if (n < 6) errors.push(`practice problems for ${domain}: need at least 6, found ${n}`);
  }
  const expected: Array<[string, number, number]> = [
    ["assessment aptitude", poolCount("assessment", "apt-"), 10],
    ["assessment coding", poolCount("assessment", "dsa-"), 10],
    ["mock", questions.filter((q) => q.pool === "mock").length, 10],
    ["coding problems", codingProblems.length, 2],
    ["assessment communication prompts", commPrompts.length, 10],
  ];
  for (const [label, actual, want] of expected) {
    if (actual !== want) errors.push(`${label}: expected ${want}, found ${actual}`);
  }

  const graph = new Map(skills.map((s) => [s.id, s.prerequisites]));
  const cycle = findCycle(graph);
  if (cycle) errors.push(`skills: prerequisite cycle ${cycle.join(" -> ")}`);
  return errors;
}

async function syncCollection(db: Firestore, { name, docs }: SeedCollection): Promise<void> {
  const ref = db.collection(name);
  const wanted = new Set(docs.map((d) => d.id));
  const existing = await ref.listDocuments();
  const stale = existing.filter((doc) => !wanted.has(doc.id));

  const writes: Array<(batch: WriteBatch) => void> = [
    ...docs.map(({ id, ...data }) => (batch: WriteBatch) => {
      batch.set(ref.doc(id), data);
    }),
    ...stale.map((doc) => (batch: WriteBatch) => {
      batch.delete(doc);
    }),
  ];

  for (let i = 0; i < writes.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = db.batch();
    for (const write of writes.slice(i, i + FIRESTORE_BATCH_LIMIT)) write(batch);
    await batch.commit();
  }
  console.log(`  ${name}: wrote ${docs.length}, deleted ${stale.length} stale`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const errors = [
    ...validateDocs("skills", skills, SkillSchema),
    ...validateDocs("companies", companies, CompanySchema),
    ...validateDocs("commPrompts", commPrompts, CommPromptSchema),
    ...validateDocs("questions", questions, QuestionSchema),
    ...validateDocs("codingProblems", codingProblems, CodingProblemSchema),
    ...validateDocs("practiceProblems", practiceProblems, PracticeProblemSchema),
    ...validateReferences(),
  ];
  if (errors.length > 0) {
    console.error(`Seed data is invalid:\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  console.log(
    `Seed data valid: ${skills.length} skills, ${companies.length} companies, ${commPrompts.length} comm prompts, ${questions.length} questions, ${codingProblems.length} coding problems, ${practiceProblems.length} practice problems.`,
  );
  if (dryRun) return;

  const db = getAdminDb();
  console.log("Writing to Firestore...");
  await syncCollection(db, { name: "skills", docs: skills });
  await syncCollection(db, { name: "companies", docs: companies });
  await syncCollection(db, { name: "commPrompts", docs: commPrompts });
  await syncCollection(db, { name: "questions", docs: questions });
  await syncCollection(db, { name: "codingProblems", docs: codingProblems });
  await syncCollection(db, {
    name: "practiceProblems",
    docs: practiceProblems.map(({ id, ...p }) => ({ id, ...toStoredProblem(p) })),
  });
  console.log("Done.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
