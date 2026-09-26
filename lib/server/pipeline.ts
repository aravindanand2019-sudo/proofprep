// The core loop for any answered set of questions (assessment, practice, mock round 1):
// grade → attempts → rules (+P4 for ambiguous) → mistakes → mastery → comm scoring (P8)
// → category scores + readiness snapshot. Returns before/after readiness.
import { classifyByRules, isOverconfident, type RuleVerdict } from "@/lib/engine/classifierRules";
import { commMetrics, heuristicCommScore } from "@/lib/engine/comm";
import { applyAttempt } from "@/lib/engine/mastery";
import {
  getCommPrompts,
  getQuestionsByIds,
  getSkills,
  getSkillStates,
  newAttemptIds,
  newMistakeIds,
  saveAttempts,
  saveCommAttempts,
  saveMistakes,
  saveSkillStates,
} from "@/lib/data";
import {
  commOverall,
  P4MistakeClassifierOutputSchema,
  P8CommScorerOutputSchema,
  type Attempt,
  type AttemptSource,
  type CommAttempt,
  type Confidence,
  type Mistake,
  type MistakeType,
  type Question,
  type ReadinessTrigger,
  type SkillState,
  type WithId,
} from "@/lib/schemas";
import { tryLlm } from "./llm";
import { computeUserReadiness, recordSnapshots, type CompanyReport } from "./readiness";

export type McqAnswer = {
  questionId: string;
  selectedIndex: number | null;
  confidence: Confidence | null;
  timeTakenSec: number;
};

export type CommAnswer = {
  promptId: string;
  transcript: string;
  durationSec: number | null;
};

export type GradedAnswer = {
  questionId: string;
  isCorrect: boolean;
  selectedIndex: number | null;
  correctIndex: number | null;
  explanation: string;
  distractorTag: string | null;
  /** Coding-pattern questions only: revealed after grading. */
  pattern: string | null;
  approach: string | null;
  mistake: { primaryType: MistakeType; overconfident: boolean; explanation: string } | null;
};

export type CommResult = {
  promptId: string;
  overall: number;
  scoredBy: "ai" | "heuristic";
  attempt: CommAttempt;
};

export type ScoreSummary = Array<{ companyId: string; companyName: string; score: number }>;

export type SessionResult = {
  graded: GradedAnswer[];
  comm: CommResult[];
  correct: number;
  total: number;
  before: ScoreSummary;
  after: ScoreSummary;
  aiNotes: string[];
};

const summarize = (reports: CompanyReport[]): ScoreSummary =>
  reports.map((r) => ({
    companyId: r.company.id,
    companyName: r.company.name,
    score: r.report.score,
  }));

/** Grades against the server-side answer key. Unknown question ids are dropped. */
export function gradeAnswers(
  answers: McqAnswer[],
  bank: Map<string, WithId<Question>>,
): Array<{
  answer: McqAnswer;
  question: WithId<Question>;
  isCorrect: boolean;
  tag: string | null;
}> {
  return answers.flatMap((answer) => {
    const question = bank.get(answer.questionId);
    if (!question) return [];
    const isCorrect =
      answer.selectedIndex !== null && answer.selectedIndex === question.correctIndex;
    const tag =
      !isCorrect && answer.selectedIndex !== null
        ? (question.distractorTags[String(answer.selectedIndex)] ?? null)
        : null;
    return [{ answer, question, isCorrect, tag }];
  });
}

const TEMPLATE: Record<MistakeType, { explanation: string; fix: string }> = {
  careless: {
    explanation:
      "You likely know this, but slipped: you answered quickly or picked a trap option on a skill you are strong in.",
    fix: "Timed accuracy drill: re-read the question and check your answer once before submitting.",
  },
  concept: {
    explanation:
      "Your answer matches a common misconception, so the underlying idea needs another look.",
    fix: "Revisit the concept, then do 5 basic questions on it.",
  },
  application: {
    explanation: "You get the basic questions on this skill right but missed an applied one.",
    fix: "Work through one solved example step by step, then do a mixed drill.",
  },
};

function templateMistake(verdict: RuleVerdict, question: Question, overconfident: boolean) {
  const t = TEMPLATE[verdict.primaryType];
  return {
    explanation:
      `${t.explanation} ${overconfident ? "You marked it Sure, so double-check answers you feel certain about." : ""} Why: ${question.explanation}`.trim(),
    fix: t.fix,
  };
}

async function scoreComm(answers: CommAnswer[], aiNotes: string[]): Promise<CommResult[]> {
  if (answers.length === 0) return [];
  const prompts = new Map((await getCommPrompts()).map((p) => [p.id, p]));
  const results = await Promise.all(
    answers.map(async (answer): Promise<CommResult | null> => {
      const prompt = prompts.get(answer.promptId);
      if (!prompt || !answer.transcript.trim()) return null;
      const metrics = commMetrics(answer.transcript, answer.durationSec);
      const ai = await tryLlm(
        "p8-comm-scorer",
        {
          prompt: prompt.text,
          kind: prompt.kind,
          transcript: answer.transcript,
          targetDurationSec: prompt.targetDurationSec,
          metrics: {
            wordCount: metrics.wordCount,
            durationSec: metrics.durationSec,
            wpm: metrics.wpm,
            fillerCount: metrics.fillerCount,
          },
        },
        P8CommScorerOutputSchema,
      );
      const fallback = heuristicCommScore(
        answer.transcript,
        prompt.kind,
        prompt.targetDurationSec,
        metrics,
      );
      if (!ai.ok) aiNotes.push(`Communication scored without AI: ${ai.error}`);
      const scored = ai.ok
        ? { ...ai.data, restructured: ai.data.restructured }
        : { ...fallback, restructured: "" };
      const attempt: CommAttempt = {
        promptId: prompt.id,
        transcript: answer.transcript,
        durationSec: metrics.durationSec ?? (metrics.wordCount / 130) * 60,
        wpm: metrics.wpm ?? 130,
        fillerCount: metrics.fillerCount,
        fillers: metrics.fillers,
        scores: scored.scores,
        overall: commOverall(scored.scores),
        structureDetected: scored.structureDetected,
        missingParts: scored.missingParts,
        restructured: scored.restructured,
        tips: scored.tips,
        createdAt: new Date(),
      };
      return {
        promptId: prompt.id,
        overall: attempt.overall,
        scoredBy: ai.ok ? "ai" : "heuristic",
        attempt,
      };
    }),
  );
  const ok = results.filter((r): r is CommResult => r !== null);
  return ok;
}

export async function processSession(
  uid: string,
  session: {
    source: AttemptSource;
    sourceId: string;
    trigger: ReadinessTrigger;
    mcq: McqAnswer[];
    comm?: CommAnswer[];
  },
): Promise<SessionResult> {
  const aiNotes: string[] = [];
  const beforeReadiness = await computeUserReadiness(uid);
  const [bank, skills, states] = await Promise.all([
    getQuestionsByIds(session.mcq.map((a) => a.questionId)),
    getSkills(),
    getSkillStates(uid),
  ]);
  const skillNames = new Map(skills.map((s) => [s.id, s.name]));
  const graded = gradeAnswers(session.mcq, bank);
  const now = new Date();

  // 1. Classify wrong answers: rules first, using the skill state before this session.
  const verdicts = graded.map((g) => {
    if (g.isCorrect) return null;
    const state = states[g.question.skillId];
    const timeRatio = g.answer.timeTakenSec / g.question.expectedTimeSec;
    const rule =
      g.answer.selectedIndex === null
        ? null
        : classifyByRules({
            timeRatio,
            confidence: g.answer.confidence,
            distractorTag: g.tag,
            skillMastery: state?.mastery ?? 0.5,
            questionLevel: g.question.level,
            conceptStats: state?.levelStats.concept ?? { attempts: 0, correct: 0 },
          });
    return { rule, timeRatio, mastery: state?.mastery ?? 0.5 };
  });

  // 2. P4 for the ambiguous ones (one batched call); fall back to "concept".
  const attemptIds = newAttemptIds(uid, graded.length);
  const ambiguous = graded
    .map((g, i) => ({ g, i, v: verdicts[i] }))
    .filter((x) => x.v && !x.v.rule);
  const p4 = new Map<
    number,
    { primaryType: MistakeType; explanation: string; fixAction: string }
  >();
  if (ambiguous.length > 0) {
    const ai = await tryLlm(
      "p4-mistake-classifier",
      {
        items: ambiguous.map(({ g, i, v }) => {
          const concept = states[g.question.skillId]?.levelStats.concept;
          return {
            attemptId: attemptIds[i] ?? String(i),
            question: g.question.prompt,
            options: g.question.options,
            correctAnswer: g.question.options[g.question.correctIndex ?? 0] ?? "",
            chosenAnswer:
              g.answer.selectedIndex === null
                ? null
                : (g.question.options[g.answer.selectedIndex] ?? null),
            distractorTag: g.tag,
            confidence: g.answer.confidence,
            timeRatio: Math.round((v?.timeRatio ?? 1) * 100) / 100,
            skill: skillNames.get(g.question.skillId) ?? g.question.skillId,
            skillMastery: Math.round((v?.mastery ?? 0.5) * 100) / 100,
            conceptAccuracy:
              concept && concept.attempts > 0 ? concept.correct / concept.attempts : null,
            questionLevel: g.question.level,
          };
        }),
      },
      P4MistakeClassifierOutputSchema,
      { model: "fast" },
    );
    if (!ai.ok) aiNotes.push(`Mistakes classified by rules only: ${ai.error}`);
    for (const { i } of ambiguous) {
      const item = ai.ok ? ai.data.items.find((it) => it.attemptId === attemptIds[i]) : undefined;
      p4.set(i, {
        primaryType: item?.primaryType ?? "concept",
        explanation:
          item?.explanation ??
          `This one needs another look. ${graded[i]?.question.explanation ?? ""}`.trim(),
        fixAction: item?.fixAction ?? "Review the explanation, then retry 3 similar questions.",
      });
    }
  }

  // 3. Build attempts, mistakes and new skill states (applied in answer order).
  const nextStates: Record<string, SkillState> = { ...states };
  const attempts: Array<{ id: string; data: Attempt }> = [];
  const mistakes: Array<{ id: string; data: Mistake }> = [];
  const mistakeIds = newMistakeIds(uid, graded.length);
  const out: GradedAnswer[] = [];

  graded.forEach((g, i) => {
    const attemptId = attemptIds[i] ?? "";
    const verdict = verdicts[i];
    const overconfident = !g.isCorrect && isOverconfident(g.answer.confidence);
    const rule = verdict?.rule ?? null;
    const llmItem = p4.get(i);
    const primaryType: MistakeType | null = g.isCorrect
      ? null
      : (rule?.primaryType ?? llmItem?.primaryType ?? "concept");
    const text = rule ? templateMistake(rule, g.question, overconfident) : null;

    let mistakeId: string | undefined;
    if (primaryType) {
      mistakeId = mistakeIds[i] ?? "";
      mistakes.push({
        id: mistakeId,
        data: {
          attemptId,
          skillId: g.question.skillId,
          primaryType,
          overconfident,
          classifiedBy: rule ? "rule" : llmItem ? "llm" : "rule",
          signals: {
            timeRatio: verdict?.timeRatio ?? 1,
            confidence: g.answer.confidence,
            distractorTag: g.tag,
            skillMastery: Math.min(1, Math.max(0, verdict?.mastery ?? 0.5)),
          },
          explanation: text?.explanation ?? llmItem?.explanation ?? g.question.explanation,
          fixAction: text?.fix ?? llmItem?.fixAction ?? "Retry 3 similar questions.",
          resolved: false,
        },
      });
    }

    attempts.push({
      id: attemptId,
      data: {
        questionId: g.question.id,
        skillId: g.question.skillId,
        source: session.source,
        sourceId: session.sourceId,
        answer: g.answer.selectedIndex ?? "",
        isCorrect: g.isCorrect,
        confidence: g.answer.confidence,
        timeTakenSec: Math.max(0, g.answer.timeTakenSec),
        createdAt: now,
        ...(mistakeId ? { mistakeId } : {}),
      },
    });

    nextStates[g.question.skillId] = applyAttempt(nextStates[g.question.skillId] ?? null, {
      isCorrect: g.isCorrect,
      difficulty: g.question.difficulty,
      level: g.question.level,
      confidence: g.answer.confidence,
      mistakeType: primaryType,
      overconfident,
      at: now,
    });

    out.push({
      questionId: g.question.id,
      isCorrect: g.isCorrect,
      selectedIndex: g.answer.selectedIndex,
      correctIndex: g.question.correctIndex,
      explanation: g.question.explanation,
      distractorTag: g.tag,
      pattern: g.question.pattern ?? null,
      approach: g.question.approach ?? null,
      mistake: primaryType
        ? {
            primaryType,
            overconfident,
            explanation: mistakes[mistakes.length - 1]?.data.explanation ?? "",
          }
        : null,
    });
  });

  const touched = Object.fromEntries(
    Object.entries(nextStates).filter(([id]) => graded.some((g) => g.question.skillId === id)),
  );
  const comm = await scoreComm(session.comm ?? [], aiNotes);

  await Promise.all([
    attempts.length ? saveAttempts(uid, attempts) : Promise.resolve([]),
    mistakes.length ? saveMistakes(uid, mistakes) : Promise.resolve([]),
    Object.keys(touched).length ? saveSkillStates(uid, touched) : Promise.resolve(),
    comm.length
      ? saveCommAttempts(
          uid,
          comm.map((c) => c.attempt),
        )
      : Promise.resolve([]),
  ]);

  const after = await recordSnapshots(uid, session.trigger);
  return {
    graded: out,
    comm,
    correct: out.filter((g) => g.isCorrect).length,
    total: out.length,
    before: summarize(beforeReadiness.reports),
    after: summarize(after.reports),
    aiNotes: [...new Set(aiNotes)],
  };
}
