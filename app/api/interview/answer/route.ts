// POST { sessionId, answer }: next P6 question, or P7 evaluation after the last answer.
import { z } from "zod";
import { parseBody, withUser } from "@/lib/server/api";
import { answerDefense } from "@/lib/server/projects";

const Body = z.object({ sessionId: z.string(), answer: z.string().max(4000) });

export async function POST(request: Request) {
  return withUser(async (uid) => answerDefense(uid, await parseBody(request, Body)));
}
