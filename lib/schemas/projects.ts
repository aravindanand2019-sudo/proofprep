// Project Defense collections under users/{uid} (PLAN.md Section 3).
import { z } from "zod";
import {
  ClaimVerdictSchema,
  InterviewIntentSchema,
  InterviewModeSchema,
  Score5Schema,
  TimestampSchema,
} from "./common.ts";

export const ProjectClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  verdict: ClaimVerdictSchema,
  evidence: z.string(),
  fileRefs: z.array(z.string()),
});
export type ProjectClaim = z.infer<typeof ProjectClaimSchema>;

export const InterviewHookSchema = z.object({
  topic: z.string().min(1),
  why: z.string(),
  /** null for resume-only projects, which have no code to point at. */
  fileRef: z.string().nullable(),
});
export type InterviewHook = z.infer<typeof InterviewHookSchema>;

// users/{uid}/projects/{projectId}
export const ProjectSchema = z.object({
  source: z.enum(["github", "resume"]),
  repoUrl: z.string().optional(),
  name: z.string().min(1),
  summary: z.string(),
  stackDetected: z.array(z.string()),
  claims: z.array(ProjectClaimSchema),
  interviewHooks: z.array(InterviewHookSchema),
  defenseScore: Score5Schema.optional(),
  analyzedAt: TimestampSchema,
});
export type Project = z.infer<typeof ProjectSchema>;

/** Per-turn evaluation; shared by InterviewSession.turns[].eval and the P7 output. */
export const TurnEvaluationSchema = z.object({
  scores: z.object({
    correctness: Score5Schema,
    depth: Score5Schema,
    clarity: Score5Schema,
  }),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  idealOutline: z.array(z.string()),
  skillEvidence: z.array(
    z.object({
      skillId: z.string().min(1),
      signal: z.enum(["positive", "negative"]),
    }),
  ),
  claimVerdictUpdate: z.object({
    claimId: z.string().nullable(),
    verdict: ClaimVerdictSchema.nullable(),
  }),
});
export type TurnEvaluation = z.infer<typeof TurnEvaluationSchema>;

export const InterviewOverallSchema = z.object({
  score: Score5Schema,
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
});
export type InterviewOverall = z.infer<typeof InterviewOverallSchema>;

export const MAX_INTERVIEW_TURNS = 12;

export const InterviewTurnSchema = z.object({
  question: z.string().min(1),
  intent: InterviewIntentSchema,
  targetSkillId: z.string().optional(),
  /** null until the student answers. */
  answer: z.string().nullable(),
  eval: TurnEvaluationSchema.optional(),
});
export type InterviewTurn = z.infer<typeof InterviewTurnSchema>;

// users/{uid}/interviewSessions/{sessionId}
export const InterviewSessionSchema = z.object({
  mode: InterviewModeSchema,
  companyId: z.string().optional(),
  projectId: z.string().optional(),
  turns: z.array(InterviewTurnSchema).max(MAX_INTERVIEW_TURNS),
  /** Set when the session is completed and P7 has run. */
  overall: InterviewOverallSchema.optional(),
  status: z.enum(["in_progress", "completed", "abandoned"]),
  createdAt: TimestampSchema,
});
export type InterviewSession = z.infer<typeof InterviewSessionSchema>;
