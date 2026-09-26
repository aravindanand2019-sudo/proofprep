// Communication Coach collections (PLAN.md Section 3).
import { z } from "zod";
import {
  CountSchema,
  Score100Schema,
  Score5Schema,
  StructureSchema,
  TimestampSchema,
} from "./common.ts";

// commPrompts/{promptId}: seeded, client-readable.
export const CommPromptKindSchema = z.enum(["behavioral", "technical", "opinion"]);
export type CommPromptKind = z.infer<typeof CommPromptKindSchema>;

export const CommPromptSchema = z.object({
  text: z.string().min(1),
  /** behavioral → STAR; technical and opinion → claim-reason-example (P8). */
  kind: CommPromptKindSchema,
  targetDurationSec: z.number().int().positive(),
  skillId: z.string().min(1).optional(),
});
export type CommPrompt = z.infer<typeof CommPromptSchema>;

export const CommScoresSchema = z.object({
  structure: Score5Schema,
  relevance: Score5Schema,
  clarity: Score5Schema,
  length: Score5Schema,
});
export type CommScores = z.infer<typeof CommScoresSchema>;

/** overall (0–100) = mean(structure, relevance, clarity, length) × 20. Computed in code, never by the LLM. */
export function commOverall(scores: CommScores): number {
  return ((scores.structure + scores.relevance + scores.clarity + scores.length) / 4) * 20;
}

const OVERALL_TOLERANCE = 1e-6;

// users/{uid}/commAttempts/{attemptId}
export const CommAttemptSchema = z
  .object({
    promptId: z.string().min(1),
    /** Links a re-record to the attempt it improves on. */
    parentAttemptId: z.string().optional(),
    transcript: z.string(),
    durationSec: z.number().min(0),
    wpm: z.number().min(0),
    fillerCount: CountSchema,
    fillers: z.record(z.string(), CountSchema),
    scores: CommScoresSchema,
    /** Always commOverall(scores); the schema rejects any other value. */
    overall: Score100Schema,
    structureDetected: StructureSchema,
    missingParts: z.array(z.string()),
    restructured: z.string(),
    tips: z.array(z.string()),
    createdAt: TimestampSchema,
  })
  .refine((a) => Math.abs(a.overall - commOverall(a.scores)) <= OVERALL_TOLERANCE, {
    message: "overall must equal commOverall(scores)",
    path: ["overall"],
  });
export type CommAttempt = z.infer<typeof CommAttemptSchema>;
