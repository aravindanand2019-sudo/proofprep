// Per-user learning-loop collections under users/{uid} (PLAN.md Section 3).
import { z } from "zod";
import {
  ConfidenceSchema,
  CountSchema,
  MistakeTargetSchema,
  MistakeTypeSchema,
  Score100Schema,
  TaskKindSchema,
  TimestampSchema,
  UnitIntervalSchema,
} from "./common.ts";
import { ReadinessResultSchema } from "./user.ts";

export const LevelStatSchema = z.object({
  attempts: CountSchema,
  correct: CountSchema,
});
export type LevelStat = z.infer<typeof LevelStatSchema>;

const EMPTY_LEVEL_STAT: LevelStat = { attempts: 0, correct: 0 };

// users/{uid}/skillStates/{skillId}
export const SkillStateSchema = z.object({
  mastery: UnitIntervalSchema,
  attempts: CountSchema,
  correct: CountSchema,
  lastPracticedAt: TimestampSchema.nullable(),
  mistakeCounts: z.object({
    concept: CountSchema,
    application: CountSchema,
    careless: CountSchema,
    overconfident: CountSchema,
  }),
  calibration: z.object({
    sureCorrect: CountSchema,
    sureWrong: CountSchema,
  }),
  /** Accuracy split by question level; P4's application rule reads it. Missing levels parse as 0/0. */
  levelStats: z
    .object({
      concept: LevelStatSchema.default(EMPTY_LEVEL_STAT),
      application: LevelStatSchema.default(EMPTY_LEVEL_STAT),
    })
    .default({ concept: EMPTY_LEVEL_STAT, application: EMPTY_LEVEL_STAT }),
});
export type SkillState = z.infer<typeof SkillStateSchema>;

// users/{uid}/assessments/{assessmentId}
export const AssessmentSectionSchema = z.enum([
  "aptitude",
  "cs",
  "code_reasoning",
  "communication",
]);
export type AssessmentSection = z.infer<typeof AssessmentSectionSchema>;

export const SectionStatusSchema = z.enum(["not_started", "in_progress", "skipped", "done"]);
export type SectionStatus = z.infer<typeof SectionStatusSchema>;

export const AssessmentSectionStateSchema = z.object({
  status: SectionStatusSchema,
  questionIds: z.array(z.string()),
  score: Score100Schema.nullable(),
});
export type AssessmentSectionState = z.infer<typeof AssessmentSectionStateSchema>;

export const AssessmentSchema = z.object({
  kind: z.enum(["quick", "recheck"]),
  status: z.enum(["in_progress", "completed"]),
  startedAt: TimestampSchema,
  completedAt: TimestampSchema.nullable(),
  sections: z.partialRecord(AssessmentSectionSchema, AssessmentSectionStateSchema),
});
export type Assessment = z.infer<typeof AssessmentSchema>;

// users/{uid}/attempts/{attemptId}
export const AttemptSourceSchema = z.enum(["assessment", "practice", "interview"]);
export type AttemptSource = z.infer<typeof AttemptSourceSchema>;

export const AttemptSchema = z.object({
  questionId: z.string().min(1),
  skillId: z.string().min(1),
  source: AttemptSourceSchema,
  sourceId: z.string().min(1),
  /** Option index for MCQ-style questions, free text otherwise. */
  answer: z.union([z.number().int().min(0), z.string()]),
  isCorrect: z.boolean(),
  /** null when no confidence was asked (e.g. interview answers). */
  confidence: ConfidenceSchema.nullable(),
  timeTakenSec: z.number().min(0),
  createdAt: TimestampSchema,
  mistakeId: z.string().optional(),
});
export type Attempt = z.infer<typeof AttemptSchema>;

// users/{uid}/mistakes/{mistakeId}
export const MistakeSignalsSchema = z.object({
  /** timeTakenSec / question.expectedTimeSec */
  timeRatio: z.number().min(0),
  confidence: ConfidenceSchema.nullable(),
  distractorTag: z.string().nullable(),
  skillMastery: UnitIntervalSchema,
});
export type MistakeSignals = z.infer<typeof MistakeSignalsSchema>;

export const MistakeSchema = z.object({
  attemptId: z.string().min(1),
  skillId: z.string().min(1),
  primaryType: MistakeTypeSchema,
  overconfident: z.boolean(),
  classifiedBy: z.enum(["rule", "llm"]),
  signals: MistakeSignalsSchema,
  explanation: z.string(),
  fixAction: z.string(),
  resolved: z.boolean(),
  resolvedAt: TimestampSchema.optional(),
});
export type Mistake = z.infer<typeof MistakeSchema>;

// users/{uid}/roadmaps/{roadmapId}
export const RoadmapTriggerSchema = z.enum([
  "assessment",
  "band_change",
  "mistake_pattern",
  "manual",
]);
export type RoadmapTrigger = z.infer<typeof RoadmapTriggerSchema>;

export const RoadmapSchema = z.object({
  generatedAt: TimestampSchema,
  trigger: RoadmapTriggerSchema,
  rationale: z.string(),
  weeks: z.array(
    z.object({
      week: z.number().int().min(1),
      focus: z.string(),
      taskIds: z.array(z.string()),
    }),
  ),
});
export type Roadmap = z.infer<typeof RoadmapSchema>;

// users/{uid}/tasks/{taskId}
export const TaskStatusSchema = z.enum(["todo", "done", "skipped"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  roadmapId: z.string().min(1),
  skillId: z.string().optional(),
  kind: TaskKindSchema,
  targetsMistakeType: MistakeTargetSchema.optional(),
  title: z.string().min(1),
  estMinutes: z.number().int().positive(),
  dueDate: TimestampSchema,
  status: TaskStatusSchema,
  completedAt: TimestampSchema.optional(),
});
export type Task = z.infer<typeof TaskSchema>;

// users/{uid}/readinessSnapshots/{snapshotId}
export const ReadinessTriggerSchema = z.enum([
  "assessment",
  "practice",
  "interview",
  "project_analysis",
  "comm_attempt",
  "manual",
]);
export type ReadinessTrigger = z.infer<typeof ReadinessTriggerSchema>;

export const ReadinessSnapshotSchema = z.object({
  createdAt: TimestampSchema,
  trigger: ReadinessTriggerSchema,
  perCompany: z.record(z.string(), ReadinessResultSchema),
});
export type ReadinessSnapshot = z.infer<typeof ReadinessSnapshotSchema>;
