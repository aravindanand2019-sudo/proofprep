// Daily coding problems and the user's submissions.
import { getAdminDb } from "@/lib/firebase/admin";
import {
  CodingSubmissionSchema,
  fromStoredProblem,
  StoredPracticeProblemSchema,
  type CodingSubmission,
  type PracticeProblem,
  type WithId,
} from "@/lib/schemas";
import { readAll, userCollection, writeMany } from "./base";

let problemsCache: { at: number; value: Promise<WithId<PracticeProblem>[]> } | null = null;

/** Seeded problems, cached for 5 minutes per server process. */
export function getPracticeProblems(): Promise<WithId<PracticeProblem>[]> {
  if (problemsCache && Date.now() - problemsCache.at < 5 * 60 * 1000) return problemsCache.value;
  const value = readAll(getAdminDb().collection("practiceProblems"), StoredPracticeProblemSchema)
    .then((docs) => docs.map(({ id, ...stored }) => ({ id, ...fromStoredProblem(stored) })))
    .catch((error: unknown) => {
      problemsCache = null;
      throw error;
    });
  problemsCache = { at: Date.now(), value };
  return value;
}

export async function saveCodingSubmission(
  uid: string,
  submission: CodingSubmission,
): Promise<string> {
  const [id] = await writeMany(userCollection(uid, "codingSubmissions"), CodingSubmissionSchema, [
    { data: submission },
  ]);
  return id ?? "";
}

/** Newest first. */
export function getCodingSubmissions(
  uid: string,
  limit = 200,
): Promise<WithId<CodingSubmission>[]> {
  return readAll(
    userCollection(uid, "codingSubmissions").orderBy("createdAt", "desc").limit(limit),
    CodingSubmissionSchema,
  );
}
