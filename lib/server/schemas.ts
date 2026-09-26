// Request-body schemas shared by answer-submitting routes.
import { z } from "zod";
import { ConfidenceSchema } from "@/lib/schemas";

export const McqAnswerBody = z.object({
  questionId: z.string(),
  selectedIndex: z.number().int().min(0).nullable(),
  confidence: ConfidenceSchema.nullable(),
  timeTakenSec: z.number().min(0).max(3600),
});

export const CommAnswerBody = z.object({
  promptId: z.string(),
  transcript: z.string().max(8000),
  durationSec: z.number().positive().nullable(),
});
