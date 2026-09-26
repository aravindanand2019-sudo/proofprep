import type { Confidence } from "@/lib/schemas";

export type PublicQ = {
  id: string;
  skillId: string;
  type: string;
  prompt: string;
  options: string[];
  expectedTimeSec: number;
};

export type CommQ = { id: string; text: string; kind: string; targetDurationSec: number };

export type QuizItem = { kind: "mcq"; q: PublicQ } | { kind: "comm"; q: CommQ };

export type QuizSection = { id: string; label: string; items: QuizItem[] };

export type McqAnswerState = {
  selectedIndex: number | null;
  confidence: Confidence | null;
  timeTakenSec: number;
};

export type CommAnswerState = { transcript: string; durationSec: number | null };

export type QuizSubmission = {
  mcq: Array<{ questionId: string } & McqAnswerState>;
  comm: Array<{ promptId: string } & CommAnswerState>;
};

/** Shape returned by the pipeline routes (lib/server/pipeline.ts SessionResult). */
export type SessionResultView = {
  correct: number;
  total: number;
  graded: Array<{
    questionId: string;
    isCorrect: boolean;
    selectedIndex: number | null;
    correctIndex: number | null;
    explanation: string;
    pattern?: string | null;
    approach?: string | null;
    mistake: { primaryType: string; overconfident: boolean; explanation: string } | null;
  }>;
  comm: Array<{
    promptId: string;
    overall: number;
    scoredBy: "ai" | "heuristic";
    attempt: {
      restructured: string;
      tips: string[];
      missingParts: string[];
      structureDetected: string;
    };
  }>;
  before: Array<{ companyId: string; companyName: string; score: number }>;
  after: Array<{ companyId: string; companyName: string; score: number }>;
  aiNotes: string[];
};
