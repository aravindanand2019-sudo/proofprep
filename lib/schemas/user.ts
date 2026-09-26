// users/{uid} and readiness shapes (PLAN.md Sections 3 and 5).
import { z } from "zod";
import { componentRecord, Score100Schema, TimestampSchema } from "./common.ts";

export const DEFAULT_HOURS_PER_DAY = 2;
export const MAX_TARGET_COMPANIES = 3;

export const OnboardingStepSchema = z.enum([
  "target",
  "timeline",
  "optional",
  "assessment",
  "done",
]);
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

export const AssessmentStatusSchema = z.enum(["none", "in_progress", "skipped", "done"]);
export type AssessmentStatus = z.infer<typeof AssessmentStatusSchema>;

export const ProfileLinksSchema = z.object({
  github: z.string().min(1).optional(),
  linkedin: z.string().min(1).optional(),
  leetcode: z.string().min(1).optional(),
});
export type ProfileLinks = z.infer<typeof ProfileLinksSchema>;

export const ResumeRefSchema = z.object({
  storagePath: z.string().min(1),
  /** null between upload and the P1 parse finishing. */
  parsedAt: TimestampSchema.nullable(),
});
export type ResumeRef = z.infer<typeof ResumeRefSchema>;

/** A fully onboarded profile. */
export const ProfileSchema = z.object({
  targetRole: z.string().min(1),
  targetCompanies: z.array(z.string().min(1)).min(1).max(MAX_TARGET_COMPANIES),
  placementDate: TimestampSchema,
  hoursPerDay: z.number().min(0.5).max(16),
  links: ProfileLinksSchema,
  resume: ResumeRefSchema.optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/**
 * PLAN.md Section 5. Per component: aptitude/dsa/cs by attempts in the category
 * (low < 6, medium 6–9, high >= 10); projects (medium = >= 1 analyzed project, high = also
 * >= 1 completed project_defense session); communication (medium = 1–2 attempts, high >= 3).
 * Overall = the lowest level among components with weight >= 0.15.
 */
export const ReadinessConfidenceSchema = z.enum(["low", "medium", "high"]);
export type ReadinessConfidence = z.infer<typeof ReadinessConfidenceSchema>;

/** Result of the readiness formula for one company. `components` holds S_k (0–100). */
export const ReadinessResultSchema = z.object({
  score: Score100Schema,
  components: componentRecord(Score100Schema),
  confidence: ReadinessConfidenceSchema,
});
export type ReadinessResult = z.infer<typeof ReadinessResultSchema>;

export const CompanyReadinessSchema = ReadinessResultSchema.extend({
  updatedAt: TimestampSchema,
});
export type CompanyReadiness = z.infer<typeof CompanyReadinessSchema>;

export const UserSchema = z.object({
  name: z.string(),
  email: z.email(),
  photoURL: z.string().nullable(),
  createdAt: TimestampSchema,
  lastActiveAt: TimestampSchema,
  onboardingStep: OnboardingStepSchema,
  assessmentStatus: AssessmentStatusSchema,
  /** Partial while onboarding is in progress; validate with ProfileSchema once it is done. */
  profile: ProfileSchema.partial(),
  /** Latest readiness per companyId, denormalised for a cheap Home read. */
  readiness: z.record(z.string(), CompanyReadinessSchema),
  activeRoadmapId: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;
