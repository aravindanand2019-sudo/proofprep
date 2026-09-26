// Collections added during integration (not in the original PLAN.md Section 3).
import { z } from "zod";
import { Score100Schema, Score5Schema, TimestampSchema } from "./common.ts";
import { ReadinessTriggerSchema } from "./learning.ts";

// codingProblems/{problemId}: seeded, server-only (mock interview round 2).
export const CodingProblemSchema = z.object({
  title: z.string().min(1),
  skillId: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  statement: z.string().min(1),
  constraints: z.array(z.string()),
  examples: z.array(
    z.object({ input: z.string(), output: z.string(), explanation: z.string().optional() }),
  ),
});
export type CodingProblem = z.infer<typeof CodingProblemSchema>;

/** Unweighted category scores (0–100); company-independent, for Progress and Skill Gap. */
export const CategoryScoresValuesSchema = z.object({
  aptitude: Score100Schema,
  dsa: Score100Schema,
  cs: Score100Schema,
  communication: Score100Schema,
  projects: Score100Schema,
});
export type CategoryScoresValues = z.infer<typeof CategoryScoresValuesSchema>;

// users/{uid}/categoryScores/{snapshotId}
export const CategoryScoresSnapshotSchema = z.object({
  createdAt: TimestampSchema,
  trigger: ReadinessTriggerSchema,
  scores: CategoryScoresValuesSchema,
});
export type CategoryScoresSnapshot = z.infer<typeof CategoryScoresSnapshotSchema>;

// P-GAP output, and users/{uid}/skillGapReports/{reportId}
export const PGapOutputSchema = z.object({
  mustLearn: z.array(z.object({ skill: z.string(), why: z.string() })),
  shouldHave: z.array(z.object({ item: z.string(), why: z.string() })),
  companyExpectations: z.array(
    z.object({ companyId: z.string(), expects: z.array(z.string()), yourGap: z.string() }),
  ),
});
export type PGapOutput = z.infer<typeof PGapOutputSchema>;

export const SkillGapReportSchema = PGapOutputSchema.extend({ createdAt: TimestampSchema });
export type SkillGapReport = z.infer<typeof SkillGapReportSchema>;

// P-CODE output: an AI review of code, not an execution.
export const PCodeOutputSchema = z.object({
  likelyCorrect: z.boolean(),
  issues: z.array(z.object({ line: z.number().int().nullable(), problem: z.string() })),
  timeComplexity: z.string(),
  spaceComplexity: z.string(),
  edgeCasesMissed: z.array(z.string()),
  score: z.number().min(0).max(10),
  hint: z.string(),
});
export type PCodeOutput = z.infer<typeof PCodeOutputSchema>;

// users/{uid}/mockInterviews/{interviewId}
export const MockInterviewSchema = z.object({
  createdAt: TimestampSchema,
  mcq: z.object({ correct: z.number().int().min(0), total: z.number().int().min(0) }).nullable(),
  coding: z
    .object({
      problemId: z.string(),
      language: z.string(),
      code: z.string(),
      review: PCodeOutputSchema.nullable(),
    })
    .nullable(),
  defense: z
    .object({
      projectId: z.string().nullable(),
      sessionId: z.string(),
      score: Score5Schema,
      strengths: z.array(z.string()),
      gaps: z.array(z.string()),
    })
    .nullable(),
  overall: z.object({
    score: Score100Schema,
    strengths: z.array(z.string()),
    gaps: z.array(z.string()),
  }),
});
export type MockInterview = z.infer<typeof MockInterviewSchema>;

// practiceProblems/{problemId}: curated classics for Daily Practice (own wording + link).
export const ProblemPlatformSchema = z.enum([
  "LeetCode",
  "Codeforces",
  "HackerRank",
  "GeeksforGeeks",
]);
export type ProblemPlatform = z.infer<typeof ProblemPlatformSchema>;

/** How a returned value is compared with the expected one. */
export const CompareModeSchema = z.enum(["exact", "sorted", "deep-sorted", "float"]);
export type CompareMode = z.infer<typeof CompareModeSchema>;

export const ProblemTestSchema = z.object({
  /** Positional arguments, JSON-serialisable. */
  args: z.array(z.unknown()),
  expected: z.unknown(),
  /** Shown in the statement as a worked example. */
  example: z.boolean(),
  explanation: z.string().optional(),
});
export type ProblemTest = z.infer<typeof ProblemTestSchema>;

export const PracticeProblemSchema = z.object({
  title: z.string().min(1),
  source: z.object({ platform: ProblemPlatformSchema, url: z.url() }),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  skillId: z.string().min(1),
  pattern: z.string().min(1),
  domains: z.array(z.enum(["sde", "fullstack", "data-ml", "service"])).min(1),
  statement: z.string().min(1),
  constraints: z.array(z.string()),
  /** snake_case function name (Python); JavaScript uses the camelCase form. */
  fn: z.string().regex(/^[a-z][a-z0-9_]*$/),
  params: z.array(z.string().regex(/^[a-z][a-zA-Z0-9_]*$/)),
  compare: CompareModeSchema,
  tests: z.array(ProblemTestSchema).min(3),
  reviewed: z.boolean(),
});
export type PracticeProblem = z.infer<typeof PracticeProblemSchema>;

/**
 * Firestore can't store arrays nested in arrays (grids, intervals), so the stored document
 * keeps the tests as a JSON string. lib/data converts between the two shapes.
 */
export const StoredPracticeProblemSchema = PracticeProblemSchema.omit({ tests: true }).extend({
  testsJson: z.string(),
});
export type StoredPracticeProblem = z.infer<typeof StoredPracticeProblemSchema>;

export function toStoredProblem(problem: PracticeProblem): StoredPracticeProblem {
  const { tests, ...rest } = problem;
  return { ...rest, testsJson: JSON.stringify(tests) };
}

export function fromStoredProblem(stored: StoredPracticeProblem): PracticeProblem {
  const { testsJson, ...rest } = stored;
  return PracticeProblemSchema.parse({ ...rest, tests: JSON.parse(testsJson) });
}

export const CodeLanguageSchema = z.enum(["python", "javascript", "cpp", "java"]);
export type CodeLanguage = z.infer<typeof CodeLanguageSchema>;

// users/{uid}/codingSubmissions/{submissionId}
export const CodingSubmissionSchema = z.object({
  problemId: z.string(),
  language: CodeLanguageSchema,
  code: z.string(),
  /** Browser test run (null for languages that can't run in the browser). */
  tests: z.object({ passed: z.number().int().min(0), total: z.number().int().min(0) }).nullable(),
  solved: z.boolean(),
  review: PCodeOutputSchema.nullable(),
  createdAt: TimestampSchema,
});
export type CodingSubmission = z.infer<typeof CodingSubmissionSchema>;
