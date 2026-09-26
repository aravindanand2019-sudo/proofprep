// Readiness snapshots, category-score history, communication attempts, skill-gap reports.
import {
  CategoryScoresSnapshotSchema,
  CommAttemptSchema,
  ReadinessSnapshotSchema,
  SkillGapReportSchema,
  type CategoryScoresSnapshot,
  type CommAttempt,
  type ReadinessSnapshot,
  type SkillGapReport,
  type WithId,
} from "@/lib/schemas";
import { readAll, userCollection, userDoc, writeMany } from "./base";

/** Appends a snapshot and denormalises the latest values onto users/{uid}.readiness. */
export async function saveReadinessSnapshot(
  uid: string,
  snapshot: ReadinessSnapshot,
): Promise<string> {
  const [id] = await writeMany(userCollection(uid, "readinessSnapshots"), ReadinessSnapshotSchema, [
    { data: snapshot },
  ]);
  const readiness = Object.fromEntries(
    Object.entries(snapshot.perCompany).map(([companyId, r]) => [
      companyId,
      { ...r, updatedAt: snapshot.createdAt },
    ]),
  );
  await userDoc(uid).update({ readiness });
  return id ?? "";
}

export function getReadinessSnapshots(uid: string): Promise<WithId<ReadinessSnapshot>[]> {
  return readAll(
    userCollection(uid, "readinessSnapshots").orderBy("createdAt", "asc").limit(200),
    ReadinessSnapshotSchema,
  );
}

export async function saveCategoryScores(
  uid: string,
  snapshot: CategoryScoresSnapshot,
): Promise<string> {
  const [id] = await writeMany(
    userCollection(uid, "categoryScores"),
    CategoryScoresSnapshotSchema,
    [{ data: snapshot }],
  );
  return id ?? "";
}

export function getCategoryScoreHistory(uid: string): Promise<WithId<CategoryScoresSnapshot>[]> {
  return readAll(
    userCollection(uid, "categoryScores").orderBy("createdAt", "asc").limit(200),
    CategoryScoresSnapshotSchema,
  );
}

export function saveCommAttempts(uid: string, attempts: CommAttempt[]): Promise<string[]> {
  return writeMany(
    userCollection(uid, "commAttempts"),
    CommAttemptSchema,
    attempts.map((data) => ({ data })),
  );
}

/** Newest first. */
export function getCommAttempts(uid: string, limit = 50): Promise<WithId<CommAttempt>[]> {
  return readAll(
    userCollection(uid, "commAttempts").orderBy("createdAt", "desc").limit(limit),
    CommAttemptSchema,
  );
}

export async function saveSkillGapReport(uid: string, report: SkillGapReport): Promise<string> {
  const [id] = await writeMany(userCollection(uid, "skillGapReports"), SkillGapReportSchema, [
    { data: report },
  ]);
  return id ?? "";
}

export async function getLatestSkillGapReport(uid: string): Promise<WithId<SkillGapReport> | null> {
  const [latest] = await readAll(
    userCollection(uid, "skillGapReports").orderBy("createdAt", "desc").limit(1),
    SkillGapReportSchema,
  );
  return latest ?? null;
}
