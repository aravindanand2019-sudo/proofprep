import {
  UserSchema,
  type AssessmentStatus,
  type OnboardingStep,
  type Profile,
  type User,
} from "@/lib/schemas";
import { readOne, userDoc } from "./base";

export async function getUserDoc(uid: string): Promise<User | null> {
  const doc = await readOne(userDoc(uid), UserSchema);
  if (!doc) return null;
  const { id: _id, ...user } = doc;
  return user;
}

export type ProfilePatch = Partial<Omit<Profile, "links" | "resume">> & {
  links?: Profile["links"];
  resume?: Profile["resume"];
};

/** Merges profile fields (dotted paths, so untouched fields survive). */
export async function updateProfile(
  uid: string,
  patch: ProfilePatch,
  extra: { name?: string } = {},
): Promise<void> {
  const updates: Record<string, unknown> = { lastActiveAt: new Date() };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) updates[`profile.${key}`] = value;
  }
  if (extra.name) updates.name = extra.name;
  await userDoc(uid).update(updates);
}

export async function setUserState(
  uid: string,
  state: {
    onboardingStep?: OnboardingStep;
    assessmentStatus?: AssessmentStatus;
    activeRoadmapId?: string;
  },
): Promise<void> {
  const updates = Object.fromEntries(Object.entries(state).filter(([, v]) => v !== undefined));
  await userDoc(uid).update({ ...updates, lastActiveAt: new Date() });
}
