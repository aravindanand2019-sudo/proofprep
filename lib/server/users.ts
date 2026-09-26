// users/{uid} and catalog reads/writes (Admin SDK). Server-only.
import { DEMO_UID } from "@/lib/auth/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import { fromFirestore } from "@/lib/firebase/convert";
import { CompanySchema, type Company, type User, UserSchema, type WithId } from "@/lib/schemas";

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getAdminDb().collection("users").doc(uid).get();
  return snap.exists ? fromFirestore(UserSchema, snap.data()) : null;
}

type NewUserInfo = { name: string; email: string; photoURL: string | null };

/** Creates users/{uid} on first sign-in; later sign-ins only bump lastActiveAt. */
export async function ensureUser(uid: string, info: NewUserInfo): Promise<User> {
  const ref = getAdminDb().collection("users").doc(uid);
  const now = new Date();
  const created = await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      tx.update(ref, { lastActiveAt: now });
      return null;
    }
    const user: User = {
      name: info.name,
      email: info.email,
      photoURL: info.photoURL,
      createdAt: now,
      lastActiveAt: now,
      onboardingStep: "target",
      assessmentStatus: "none",
      profile: {},
      readiness: {},
    };
    tx.set(ref, user);
    return user;
  });
  if (created) return created;
  const existing = await getUser(uid);
  if (!existing) throw new Error(`User ${uid} disappeared during sign-in`);
  return existing;
}

/**
 * The judges' demo account. Created onboarded if missing; the full history is seeded
 * later (PLAN.md Section 9, hours 18–22) and is never overwritten here.
 */
export async function ensureDemoUser(): Promise<void> {
  const ref = getAdminDb().collection("users").doc(DEMO_UID);
  const snap = await ref.get();
  if (snap.exists) {
    await ref.update({ lastActiveAt: new Date() });
    return;
  }
  const now = new Date();
  const placementDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const user: User = {
    name: "Demo Student",
    email: "demo@proofprep.app",
    photoURL: null,
    createdAt: now,
    lastActiveAt: now,
    onboardingStep: "done",
    assessmentStatus: "done",
    profile: {
      targetRole: "Software Development Engineer",
      targetCompanies: ["amazon-sde", "tcs-nqt", "zoho"],
      placementDate,
      hoursPerDay: 2,
      links: {},
    },
    readiness: {},
  };
  await ref.set(UserSchema.parse(user));
}

export async function getCompanies(): Promise<WithId<Company>[]> {
  const snap = await getAdminDb().collection("companies").get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...fromFirestore(CompanySchema, doc.data()) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCompany(id: string): Promise<WithId<Company> | null> {
  const snap = await getAdminDb().collection("companies").doc(id).get();
  return snap.exists ? { id: snap.id, ...fromFirestore(CompanySchema, snap.data()) } : null;
}
