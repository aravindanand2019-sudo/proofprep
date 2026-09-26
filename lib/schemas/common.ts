// Shared primitives and enums for every entity schema (PLAN.md Sections 3 and 6).
// Files under lib/schemas use relative imports with a .ts extension so that
// scripts/seed.ts can load them with plain Node (native type stripping).
import { z } from "zod";

/**
 * Firestore stores Timestamps; schemas describe the app-level shape, where
 * timestamps are plain Dates. Convert Timestamp -> Date at the read boundary.
 */
export const TimestampSchema = z.date();

export const Score100Schema = z.number().min(0).max(100);
export const Score5Schema = z.number().min(0).max(5);
export const UnitIntervalSchema = z.number().min(0).max(1);
export const CountSchema = z.number().int().min(0);

export const SkillCategorySchema = z.enum(["aptitude", "dsa", "cs", "communication"]);
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export const ReadinessComponentSchema = z.enum([
  "aptitude",
  "dsa",
  "cs",
  "projects",
  "communication",
]);
export type ReadinessComponent = z.infer<typeof ReadinessComponentSchema>;

/** An object with exactly one value per readiness component. */
export function componentRecord<T extends z.ZodType>(value: T) {
  return z.object({
    aptitude: value,
    dsa: value,
    cs: value,
    projects: value,
    communication: value,
  });
}

export const ConfidenceSchema = z.enum(["sure", "likely", "guess"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

/** Why an answer was wrong. Overconfidence is a separate flag (PLAN.md Section 1, item 2). */
export const MistakeTypeSchema = z.enum(["concept", "application", "careless"]);
export type MistakeType = z.infer<typeof MistakeTypeSchema>;

/** What a task targets: one of the three mistake types, or the overconfidence flag. */
export const MistakeTargetSchema = z.enum(["concept", "application", "careless", "overconfident"]);
export type MistakeTarget = z.infer<typeof MistakeTargetSchema>;

export const ClaimVerdictSchema = z.enum(["supported", "partial", "unsupported", "unverified"]);
export type ClaimVerdict = z.infer<typeof ClaimVerdictSchema>;

export const ClaimTypeSchema = z.enum(["tech", "feature", "metric", "role"]);
export type ClaimType = z.infer<typeof ClaimTypeSchema>;

export const InterviewModeSchema = z.enum(["project_defense", "technical", "hr"]);
export type InterviewMode = z.infer<typeof InterviewModeSchema>;

export const InterviewIntentSchema = z.enum([
  "probe_claim",
  "depth",
  "tradeoff",
  "behavioral",
  "concept",
]);
export type InterviewIntent = z.infer<typeof InterviewIntentSchema>;

export const TaskKindSchema = z.enum([
  "learn",
  "drill",
  "timed_drill",
  "calibration",
  "mock_interview",
  "project_defense",
  "comm_drill",
]);
export type TaskKind = z.infer<typeof TaskKindSchema>;

export const StructureSchema = z.enum(["STAR", "CRE", "none"]);
export type Structure = z.infer<typeof StructureSchema>;

/** Firestore document data plus its document ID. */
export type WithId<T> = T & { id: string };
