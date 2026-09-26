// POST: submit a practice set → pipeline; each correct answer resolves one open mistake
// on the same skill.
import { z } from "zod";
import { getMistakes, getQuestionsByIds, resolveMistakes } from "@/lib/data";
import { parseBody, withUser } from "@/lib/server/api";
import { processSession } from "@/lib/server/pipeline";
import { McqAnswerBody } from "@/lib/server/schemas";

const Body = z.object({ answers: z.array(McqAnswerBody).min(1).max(20) });

export async function POST(request: Request) {
  return withUser(async (uid) => {
    const { answers } = await parseBody(request, Body);
    const openBefore = await getMistakes(uid, { openOnly: true });
    const result = await processSession(uid, {
      source: "practice",
      sourceId: `practice-${Date.now()}`,
      trigger: "practice",
      mcq: answers,
    });
    const bank = await getQuestionsByIds(answers.map((a) => a.questionId));
    const toResolve: string[] = [];
    for (const g of result.graded) {
      const skillId = g.isCorrect ? bank.get(g.questionId)?.skillId : undefined;
      const m = openBefore.find((x) => x.skillId === skillId && !toResolve.includes(x.id));
      if (m) toResolve.push(m.id);
    }
    await resolveMistakes(uid, toResolve);
    return { ...result, resolvedMistakes: toResolve.length };
  });
}
