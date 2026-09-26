// POST: the only client-facing LLM entry point. Each allowed prompt has its own input
// schema; the server loads anything sensitive (problems, prompts) itself.
import { z } from "zod";
import { getCodingProblems, getCommPrompts } from "@/lib/data";
import { commMetrics } from "@/lib/engine/comm";
import { commOverall, P8CommScorerOutputSchema, PCodeOutputSchema } from "@/lib/schemas";
import { HttpError, parseBody, withUser } from "@/lib/server/api";
import { tryLlm } from "@/lib/server/llm";

const CodeBody = z.object({
  problemId: z.string(),
  language: z.string().max(30),
  code: z.string().max(20000),
});
const CommBody = z.object({
  promptId: z.string(),
  transcript: z.string().min(1).max(8000),
  durationSec: z.number().positive().nullable(),
});

export async function POST(request: Request, ctx: { params: Promise<{ promptId: string }> }) {
  const { promptId } = await ctx.params;
  return withUser(async () => {
    if (promptId === "p-code") {
      const body = await parseBody(request, CodeBody);
      const problem = (await getCodingProblems()).find((p) => p.id === body.problemId);
      if (!problem) throw new HttpError(404, "Unknown problem.");
      if (!body.code.trim()) throw new HttpError(400, "Write some code first.");
      const ai = await tryLlm(
        "p-code",
        {
          problem: {
            title: problem.title,
            statement: problem.statement,
            constraints: problem.constraints,
            examples: problem.examples,
          },
          language: body.language,
          code: body.code,
        },
        PCodeOutputSchema,
      );
      if (!ai.ok) throw new HttpError(503, ai.error);
      return { review: ai.data };
    }
    if (promptId === "p8-comm-scorer") {
      const body = await parseBody(request, CommBody);
      const prompt = (await getCommPrompts()).find((p) => p.id === body.promptId);
      if (!prompt) throw new HttpError(404, "Unknown prompt.");
      const metrics = commMetrics(body.transcript, body.durationSec);
      const ai = await tryLlm(
        "p8-comm-scorer",
        {
          prompt: prompt.text,
          kind: prompt.kind,
          transcript: body.transcript,
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
      if (!ai.ok) throw new HttpError(503, ai.error);
      return { result: ai.data, overall: commOverall(ai.data.scores), metrics };
    }
    throw new HttpError(404, `Prompt "${promptId}" is not available to clients.`);
  });
}
