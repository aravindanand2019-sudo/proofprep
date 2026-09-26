// Global seeded collections. Cached per server process: they change only on re-seed.
import { getAdminDb } from "@/lib/firebase/admin";
import {
  CodingProblemSchema,
  CommPromptSchema,
  CompanySchema,
  QuestionSchema,
  SkillSchema,
  type CodingProblem,
  type CommPrompt,
  type Company,
  type Question,
  type QuestionPool,
  type Skill,
  type WithId,
} from "@/lib/schemas";
import { readAll } from "./base";

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as Promise<T>;
  const value = load().catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { at: Date.now(), value });
  return value;
}

const db = () => getAdminDb();

export function getSkills(): Promise<WithId<Skill>[]> {
  return cached("skills", () => readAll(db().collection("skills"), SkillSchema));
}

export function getCompanies(): Promise<WithId<Company>[]> {
  return cached("companies", async () =>
    (await readAll(db().collection("companies"), CompanySchema)).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  );
}

export async function getCompany(id: string): Promise<WithId<Company> | null> {
  return (await getCompanies()).find((c) => c.id === id) ?? null;
}

/** Server-only: includes answer keys. Convert with PublicQuestionSchema before responding. */
export async function getQuestions(pool?: QuestionPool): Promise<WithId<Question>[]> {
  const all = await cached("questions", () =>
    readAll(db().collection("questions"), QuestionSchema),
  );
  return (pool ? all.filter((q) => q.pool === pool) : all).sort((a, b) => a.id.localeCompare(b.id));
}

export async function getQuestionsByIds(ids: string[]): Promise<Map<string, WithId<Question>>> {
  const all = await getQuestions();
  const wanted = new Set(ids);
  return new Map(all.filter((q) => wanted.has(q.id)).map((q) => [q.id, q]));
}

export function getCommPrompts(): Promise<WithId<CommPrompt>[]> {
  return cached("commPrompts", async () =>
    (await readAll(db().collection("commPrompts"), CommPromptSchema)).sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
  );
}

export function getCodingProblems(): Promise<WithId<CodingProblem>[]> {
  return cached("codingProblems", () =>
    readAll(db().collection("codingProblems"), CodingProblemSchema),
  );
}
