// Attempts, mistakes, skill states, assessments.
import {
  AssessmentSchema,
  AttemptSchema,
  MistakeSchema,
  SkillStateSchema,
  type Assessment,
  type Attempt,
  type Mistake,
  type SkillState,
  type WithId,
} from "@/lib/schemas";
import { readAll, userCollection, writeMany } from "./base";

export async function getSkillStates(uid: string): Promise<Record<string, SkillState>> {
  const docs = await readAll(userCollection(uid, "skillStates"), SkillStateSchema);
  return Object.fromEntries(docs.map(({ id, ...state }) => [id, state]));
}

export async function saveSkillStates(
  uid: string,
  states: Record<string, SkillState>,
): Promise<void> {
  await writeMany(
    userCollection(uid, "skillStates"),
    SkillStateSchema,
    Object.entries(states).map(([id, data]) => ({ id, data })),
  );
}

/** Pre-allocates attempt ids so mistakes can reference them before anything is written. */
export function newAttemptIds(uid: string, count: number): string[] {
  const col = userCollection(uid, "attempts");
  return Array.from({ length: count }, () => col.doc().id);
}

export function newMistakeIds(uid: string, count: number): string[] {
  const col = userCollection(uid, "mistakes");
  return Array.from({ length: count }, () => col.doc().id);
}

export function saveAttempts(
  uid: string,
  attempts: Array<{ id?: string; data: Attempt }>,
): Promise<string[]> {
  return writeMany(userCollection(uid, "attempts"), AttemptSchema, attempts);
}

export async function getAttempts(uid: string, limit = 500): Promise<WithId<Attempt>[]> {
  return readAll(
    userCollection(uid, "attempts").orderBy("createdAt", "desc").limit(limit),
    AttemptSchema,
  );
}

export function saveMistakes(
  uid: string,
  mistakes: Array<{ id?: string; data: Mistake }>,
): Promise<string[]> {
  return writeMany(userCollection(uid, "mistakes"), MistakeSchema, mistakes);
}

export async function getMistakes(
  uid: string,
  opts: { openOnly?: boolean; limit?: number } = {},
): Promise<WithId<Mistake>[]> {
  const all = await readAll(
    userCollection(uid, "mistakes").limit(opts.limit ?? 500),
    MistakeSchema,
  );
  return opts.openOnly ? all.filter((m) => !m.resolved) : all;
}

export async function resolveMistakes(uid: string, mistakeIds: string[]): Promise<void> {
  const col = userCollection(uid, "mistakes");
  await Promise.all(
    mistakeIds.map((id) => col.doc(id).update({ resolved: true, resolvedAt: new Date() })),
  );
}

export async function saveAssessment(
  uid: string,
  assessment: Assessment,
  id?: string,
): Promise<string> {
  const [savedId] = await writeMany(userCollection(uid, "assessments"), AssessmentSchema, [
    { id, data: assessment },
  ]);
  return savedId ?? "";
}

export async function getLatestAssessment(uid: string): Promise<WithId<Assessment> | null> {
  const [latest] = await readAll(
    userCollection(uid, "assessments").orderBy("startedAt", "desc").limit(1),
    AssessmentSchema,
  );
  return latest ?? null;
}
