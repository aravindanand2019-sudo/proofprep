// Shared Firestore helpers for lib/data. Server-only (Admin SDK).
import type { CollectionReference, Query } from "firebase-admin/firestore";
import type { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { fromFirestore } from "@/lib/firebase/convert";
import type { WithId } from "@/lib/schemas";

export type UserCollection =
  | "skillStates"
  | "assessments"
  | "attempts"
  | "mistakes"
  | "roadmaps"
  | "tasks"
  | "projects"
  | "interviewSessions"
  | "commAttempts"
  | "readinessSnapshots"
  | "categoryScores"
  | "skillGapReports"
  | "mockInterviews"
  | "codingSubmissions";

export function userDoc(uid: string) {
  return getAdminDb().collection("users").doc(uid);
}

export function userCollection(uid: string, name: UserCollection): CollectionReference {
  return userDoc(uid).collection(name);
}

/** Runs a query and validates every document with the schema. */
export async function readAll<T>(query: Query, schema: z.ZodType<T>): Promise<WithId<T>[]> {
  const snap = await query.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...fromFirestore(schema, doc.data()) }));
}

export async function readOne<T>(
  ref: FirebaseFirestore.DocumentReference,
  schema: z.ZodType<T>,
): Promise<WithId<T> | null> {
  const snap = await ref.get();
  return snap.exists ? { id: snap.id, ...fromFirestore(schema, snap.data()) } : null;
}

const BATCH_LIMIT = 450;

/** Writes validated documents in batches; returns their ids in input order. */
export async function writeMany<T extends object>(
  col: CollectionReference,
  schema: z.ZodType<T>,
  items: Array<{ id?: string; data: T }>,
): Promise<string[]> {
  const refs = items.map((item) => (item.id ? col.doc(item.id) : col.doc()));
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const batch = getAdminDb().batch();
    for (let j = i; j < Math.min(items.length, i + BATCH_LIMIT); j += 1) {
      const ref = refs[j];
      const item = items[j];
      if (ref && item) batch.set(ref, schema.parse(item.data) as FirebaseFirestore.DocumentData);
    }
    await batch.commit();
  }
  return refs.map((r) => r.id);
}
