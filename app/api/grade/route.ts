// POST: grade answers server-side. Never returns the answer key.
import { z } from "zod";
import { getQuestionsByIds } from "@/lib/data";
import { parseBody, withUser } from "@/lib/server/api";

const Body = z.object({
  answers: z
    .array(z.object({ questionId: z.string(), selectedIndex: z.number().int().min(0).nullable() }))
    .max(50),
});

export async function POST(request: Request) {
  return withUser(async () => {
    const { answers } = await parseBody(request, Body);
    const bank = await getQuestionsByIds(answers.map((a) => a.questionId));
    return {
      results: answers.map((a) => {
        const q = bank.get(a.questionId);
        const isCorrect =
          q !== undefined && a.selectedIndex !== null && a.selectedIndex === q.correctIndex;
        return {
          questionId: a.questionId,
          isCorrect,
          explanation: q?.explanation ?? "Unknown question.",
          distractorTag:
            q && !isCorrect && a.selectedIndex !== null
              ? (q.distractorTags[String(a.selectedIndex)] ?? null)
              : null,
        };
      }),
    };
  });
}
