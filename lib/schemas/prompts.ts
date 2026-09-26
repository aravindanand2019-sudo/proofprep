// Output schemas for LLM prompts P1–P9 (PLAN.md Section 6).
// LLM outputs use `.nullable()` rather than `.optional()` so the model always
// emits every key, which makes the JSON Schema it receives unambiguous.
import { z } from "zod";
import {
  ClaimTypeSchema,
  ClaimVerdictSchema,
  InterviewIntentSchema,
  MistakeTargetSchema,
  MistakeTypeSchema,
  StructureSchema,
  TaskKindSchema,
} from "./common.ts";
import { CommScoresSchema } from "./communication.ts";
import { InterviewHookSchema, InterviewOverallSchema, TurnEvaluationSchema } from "./projects.ts";

export const ClaimCandidateSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  type: ClaimTypeSchema,
  verifiable: z.boolean(),
});
export type ClaimCandidate = z.infer<typeof ClaimCandidateSchema>;

// P1 Resume parser
export const P1ResumeParserOutputSchema = z.object({
  education: z.array(
    z.object({
      institute: z.string(),
      degree: z.string(),
      cgpa: z.number().nullable(),
    }),
  ),
  skills: z.array(z.string()),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      repoUrl: z.string().nullable(),
      claims: z.array(ClaimCandidateSchema),
    }),
  ),
  experience: z.array(
    z.object({
      org: z.string(),
      role: z.string(),
      claims: z.array(ClaimCandidateSchema),
    }),
  ),
});
export type P1ResumeParserOutput = z.infer<typeof P1ResumeParserOutputSchema>;

// P2 Claim extractor
export const P2ClaimExtractorOutputSchema = z.object({
  claims: z.array(ClaimCandidateSchema),
});
export type P2ClaimExtractorOutput = z.infer<typeof P2ClaimExtractorOutputSchema>;

// P3 Repo analyzer
export const P3RepoAnalyzerOutputSchema = z.object({
  summary: z.string(),
  stackDetected: z.array(z.string()),
  architecture: z.string(),
  complexity: z.number().int().min(1).max(5),
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: ClaimVerdictSchema,
      evidence: z.string(),
      fileRefs: z.array(z.string()),
    }),
  ),
  redFlags: z.array(z.string()),
  interviewHooks: z.array(InterviewHookSchema),
});
export type P3RepoAnalyzerOutput = z.infer<typeof P3RepoAnalyzerOutputSchema>;

// P4 Mistake classifier
export const P4MistakeClassifierOutputSchema = z.object({
  items: z.array(
    z.object({
      attemptId: z.string(),
      primaryType: MistakeTypeSchema,
      overconfident: z.boolean(),
      /** null when no rule fired for this item. */
      agreesWithRule: z.boolean().nullable(),
      explanation: z.string(),
      conceptToRevisit: z.string(),
      fixAction: z.string(),
    }),
  ),
});
export type P4MistakeClassifierOutput = z.infer<typeof P4MistakeClassifierOutputSchema>;

// P5 Roadmap generator
export const P5RoadmapGeneratorOutputSchema = z.object({
  rationale: z.string(),
  weeks: z.array(
    z.object({
      week: z.number().int().min(1),
      focus: z.string(),
      tasks: z.array(
        z.object({
          skillId: z.string().nullable(),
          kind: TaskKindSchema,
          targetsMistakeType: MistakeTargetSchema.nullable(),
          title: z.string(),
          estMinutes: z.number().int().positive(),
          day: z.number().int().min(1).max(7),
        }),
      ),
    }),
  ),
});
export type P5RoadmapGeneratorOutput = z.infer<typeof P5RoadmapGeneratorOutputSchema>;

// P6 Interviewer (one call per turn)
export const P6InterviewerOutputSchema = z.object({
  question: z.string().min(1),
  intent: InterviewIntentSchema,
  targetSkillId: z.string().nullable(),
  claimId: z.string().nullable(),
  /** Index of the earlier turn this follows up on. */
  followUpOf: z.number().int().min(0).nullable(),
  endInterview: z.boolean(),
});
export type P6InterviewerOutput = z.infer<typeof P6InterviewerOutputSchema>;

// P7 Answer evaluator (one call per session)
export const P7AnswerEvaluatorOutputSchema = z.object({
  turns: z.array(TurnEvaluationSchema.extend({ index: z.number().int().min(0) })),
  overall: InterviewOverallSchema,
});
export type P7AnswerEvaluatorOutput = z.infer<typeof P7AnswerEvaluatorOutputSchema>;

// P8 Communication scorer
export const P8CommScorerOutputSchema = z.object({
  structureDetected: StructureSchema,
  scores: CommScoresSchema,
  missingParts: z.array(z.string()),
  restructured: z.string(),
  tips: z.array(z.string()).min(1).max(3),
});
export type P8CommScorerOutput = z.infer<typeof P8CommScorerOutputSchema>;

// P9 Re-record comparison
export const P9ReRecordCompareOutputSchema = z.object({
  improved: z.array(z.string()),
  stillMissing: z.array(z.string()),
  summary: z.string(),
});
export type P9ReRecordCompareOutput = z.infer<typeof P9ReRecordCompareOutputSchema>;
