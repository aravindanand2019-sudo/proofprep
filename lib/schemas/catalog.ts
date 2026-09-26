// Global, seeded, read-only collections: companies, skills, questions (PLAN.md Section 3).
import { z } from "zod";
import {
  componentRecord,
  Score100Schema,
  SkillCategorySchema,
  UnitIntervalSchema,
} from "./common.ts";

export const WEIGHT_SUM_TOLERANCE = 1e-9;

export const ComponentWeightsSchema = componentRecord(UnitIntervalSchema).refine(
  (w) =>
    Math.abs(w.aptitude + w.dsa + w.cs + w.projects + w.communication - 1) <= WEIGHT_SUM_TOLERANCE,
  { message: "Component weights must sum to 1" },
);
export type ComponentWeights = z.infer<typeof ComponentWeightsSchema>;

export const ComponentBarsSchema = componentRecord(Score100Schema);
export type ComponentBars = z.infer<typeof ComponentBarsSchema>;

/** 1 = normal, 2 = important, 3 = critical. Skills missing from the map count as 1. */
export const SkillImportanceSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type SkillImportance = z.infer<typeof SkillImportanceSchema>;

// companies/{companyId}
export const CompanySchema = z.object({
  name: z.string().min(1),
  tier: z.enum(["service", "product", "startup"]),
  weights: ComponentWeightsSchema,
  bars: ComponentBarsSchema,
  skillImportance: z.record(z.string(), SkillImportanceSchema),
  rounds: z.array(z.string().min(1)),
});
export type Company = z.infer<typeof CompanySchema>;

// skills/{skillId}
export const SkillSchema = z.object({
  category: SkillCategorySchema,
  name: z.string().min(1),
  parentId: z.string().optional(),
  prerequisites: z.array(z.string()),
});
export type Skill = z.infer<typeof SkillSchema>;

// questions/{questionId}
export const QuestionTypeSchema = z.enum(["mcq", "code_output", "code_bug", "spoken"]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QuestionLevelSchema = z.enum(["concept", "application"]);
export type QuestionLevel = z.infer<typeof QuestionLevelSchema>;

export const QuestionPoolSchema = z.enum(["assessment", "mock", "practice"]);

/** Career domain used to pick domain-specific coding-pattern questions. */
export const DomainSchema = z.enum(["sde", "fullstack", "data-ml", "service"]);
export type Domain = z.infer<typeof DomainSchema>;
export type QuestionPool = z.infer<typeof QuestionPoolSchema>;

/** "misconception:<id>" names the misconception a distractor catches; "slip" marks a careless trap. */
export const DistractorTagSchema = z.string().regex(/^(misconception:[a-z0-9_-]+|slip)$/);

// Unrefined base, so PublicQuestionSchema can omit fields from it.
const QuestionBaseSchema = z.object({
  skillId: z.string().min(1),
  type: QuestionTypeSchema,
  level: QuestionLevelSchema,
  difficulty: z.number().int().min(1).max(5),
  expectedTimeSec: z.number().int().positive(),
  prompt: z.string().min(1),
  options: z.array(z.string()),
  /** null only for spoken questions, which have no options. */
  correctIndex: z.number().int().min(0).nullable(),
  explanation: z.string(),
  /** Keyed by option index as a string (Firestore map keys are strings). */
  distractorTags: z.record(z.string().regex(/^\d+$/), DistractorTagSchema),
  /** Which flow uses it: the fixed quick assessment, mock interview round 1, or practice. */
  pool: QuestionPoolSchema,
  /** false until a human has checked the answer key. */
  reviewed: z.boolean(),
  /** Coding-pattern questions: the algorithm/pattern tested, e.g. "Sliding window". */
  pattern: z.string().optional(),
  /** Step-by-step approach, shown only after answering. */
  approach: z.string().optional(),
  /** Domains this question is written for; absent = every domain. */
  domains: z.array(DomainSchema).optional(),
});

/**
 * Server-only: holds the answer keys. firestore.rules denies all client access;
 * never send this shape to the browser.
 */
export const QuestionSchema = QuestionBaseSchema.refine(
  (q) =>
    q.type === "spoken"
      ? q.correctIndex === null
      : q.options.length >= 2 && q.correctIndex !== null && q.correctIndex < q.options.length,
  { message: "Non-spoken questions need >= 2 options and a valid correctIndex" },
);
export type Question = z.infer<typeof QuestionSchema>;

/**
 * The only question shape clients receive, via API routes. Parsing a Question with
 * this schema strips correctIndex, explanation and distractorTags (Zod drops unknown keys).
 */
export const PublicQuestionSchema = QuestionBaseSchema.omit({
  correctIndex: true,
  explanation: true,
  distractorTags: true,
  reviewed: true,
  pattern: true,
  approach: true,
  domains: true,
});
export type PublicQuestion = z.infer<typeof PublicQuestionSchema>;
