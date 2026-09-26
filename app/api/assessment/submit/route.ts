// POST: submit the quick assessment → full pipeline → marks onboarding done.
import { z } from "zod";
import { getQuestions, getUserDoc, saveAssessment, setUserState } from "@/lib/data";
import type { Assessment } from "@/lib/schemas";
import { HttpError, parseBody, withUser } from "@/lib/server/api";
import { processSession } from "@/lib/server/pipeline";
import { generateRoadmap } from "@/lib/server/roadmap";
import { CommAnswerBody, McqAnswerBody } from "@/lib/server/schemas";

const Body = z.object({
  answers: z.array(McqAnswerBody).max(20),
  comm: z.array(CommAnswerBody).max(10),
});

export async function POST(request: Request) {
  return withUser(async (uid) => {
    const body = await parseBody(request, Body);
    const pool = new Map((await getQuestions("assessment")).map((q) => [q.id, q]));
    if (body.answers.some((a) => !pool.has(a.questionId))) {
      throw new HttpError(400, "Unknown assessment question.");
    }

    const assessment: Assessment = {
      kind: "quick",
      status: "in_progress",
      startedAt: new Date(),
      completedAt: null,
      sections: {},
    };
    const assessmentId = await saveAssessment(uid, assessment);
    const result = await processSession(uid, {
      source: "assessment",
      sourceId: assessmentId,
      trigger: "assessment",
      mcq: body.answers,
      comm: body.comm,
    });

    const inSection = (id: string, prefix: string) =>
      pool.get(id)?.skillId.startsWith(prefix) ?? false;
    const sectionScore = (prefix: string) => {
      const graded = result.graded.filter((g) => inSection(g.questionId, prefix));
      return graded.length
        ? (100 * graded.filter((g) => g.isCorrect).length) / graded.length
        : null;
    };
    const ids = (prefix: string) =>
      body.answers.filter((a) => inSection(a.questionId, prefix)).map((a) => a.questionId);
    const commScore = result.comm.length
      ? result.comm.reduce((s, c) => s + c.overall, 0) / result.comm.length
      : null;

    await saveAssessment(
      uid,
      {
        ...assessment,
        status: "completed",
        completedAt: new Date(),
        sections: {
          aptitude: { status: "done", questionIds: ids("apt-"), score: sectionScore("apt-") },
          code_reasoning: { status: "done", questionIds: ids("dsa-"), score: sectionScore("dsa-") },
          communication: {
            status: result.comm.length ? "done" : "skipped",
            questionIds: result.comm.map((c) => c.promptId),
            score: commScore,
          },
        },
      },
      assessmentId,
    );

    const user = await getUserDoc(uid);
    await setUserState(uid, {
      assessmentStatus: "done",
      ...(user?.onboardingStep !== "done" ? { onboardingStep: "done" as const } : {}),
    });
    // Close the loop: a fresh roadmap from these results (P5 or the code fallback).
    await generateRoadmap(uid, "assessment").catch((error: unknown) => console.error(error));
    return {
      ...result,
      sections: {
        aptitude: sectionScore("apt-"),
        coding: sectionScore("dsa-"),
        communication: commScore,
      },
    };
  });
}
