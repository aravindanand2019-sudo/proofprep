// POST: finish a mock interview. Round 1 answers go through the pipeline (mastery +
// snapshot); the report combines rounds and is saved as a mockInterview.
import { z } from "zod";
import { getInterviewSession, getQuestions, saveMockInterview } from "@/lib/data";
import { PCodeOutputSchema, type MockInterview } from "@/lib/schemas";
import { HttpError, parseBody, withUser } from "@/lib/server/api";
import { processSession } from "@/lib/server/pipeline";
import { recordSnapshots } from "@/lib/server/readiness";
import { McqAnswerBody } from "@/lib/server/schemas";

const Body = z.object({
  mcq: z.array(McqAnswerBody).max(10),
  coding: z
    .object({
      problemId: z.string(),
      language: z.string(),
      code: z.string().max(20000),
      review: PCodeOutputSchema.nullable(),
    })
    .nullable(),
  defenseSessionId: z.string().nullable(),
});

export async function POST(request: Request) {
  return withUser(async (uid) => {
    const body = await parseBody(request, Body);
    const pool = new Set((await getQuestions("mock")).map((q) => q.id));
    if (body.mcq.some((a) => !pool.has(a.questionId))) {
      throw new HttpError(400, "Unknown mock question.");
    }

    const round1 = body.mcq.length
      ? await processSession(uid, {
          source: "interview",
          sourceId: `mock-${Date.now()}`,
          trigger: "interview",
          mcq: body.mcq,
        })
      : null;

    const session = body.defenseSessionId
      ? await getInterviewSession(uid, body.defenseSessionId)
      : null;
    const defense =
      session?.status === "completed" && session.overall
        ? {
            projectId: session.projectId ?? null,
            sessionId: session.id,
            score: session.overall.score,
            strengths: session.overall.strengths,
            gaps: session.overall.gaps,
          }
        : null;

    const parts: Array<{ weight: number; score: number }> = [];
    if (round1)
      parts.push({ weight: 0.4, score: (100 * round1.correct) / Math.max(1, round1.total) });
    if (body.coding?.review) parts.push({ weight: 0.3, score: body.coding.review.score * 10 });
    if (defense) parts.push({ weight: 0.3, score: defense.score * 20 });
    const weight = parts.reduce((s, p) => s + p.weight, 0);
    const overallScore = weight ? parts.reduce((s, p) => s + p.weight * p.score, 0) / weight : 0;

    const strengths: string[] = [];
    const gaps: string[] = [];
    if (round1) {
      const pct = (100 * round1.correct) / Math.max(1, round1.total);
      (pct >= 70 ? strengths : gaps).push(
        `Round 1: ${round1.correct}/${round1.total} technical & aptitude questions correct.`,
      );
    }
    if (body.coding?.review) {
      const r = body.coding.review;
      (r.score >= 7 ? strengths : gaps).push(
        `Coding: ${r.score}/10 (${r.timeComplexity}).${r.likelyCorrect ? "" : " Likely incorrect."}`,
      );
      gaps.push(...r.edgeCasesMissed.slice(0, 2).map((e) => `Missed edge case: ${e}`));
    } else if (body.coding) {
      gaps.push("Coding round was not reviewed.");
    }
    if (defense) {
      strengths.push(...defense.strengths.slice(0, 2));
      gaps.push(...defense.gaps.slice(0, 2));
    }

    const interview: MockInterview = {
      createdAt: new Date(),
      mcq: round1 ? { correct: round1.correct, total: round1.total } : null,
      coding: body.coding,
      defense,
      overall: { score: overallScore, strengths, gaps },
    };
    const id = await saveMockInterview(uid, interview);
    if (!round1) await recordSnapshots(uid, "interview");
    return { id, report: interview, round1 };
  });
}
