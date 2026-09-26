// POST: submit a solution. Browser test results + AI review (P-CODE) → mastery, readiness.
import { z } from "zod";
import { CodeLanguageSchema } from "@/lib/schemas";
import { parseBody, withUser } from "@/lib/server/api";
import { submitCoding } from "@/lib/server/coding";

const Body = z.object({
  problemId: z.string(),
  language: CodeLanguageSchema,
  code: z.string().max(20000),
  tests: z
    .object({ passed: z.number().int().min(0), total: z.number().int().min(1) })
    .refine((t) => t.passed <= t.total)
    .nullable(),
});

export async function POST(request: Request) {
  return withUser(async (uid) => submitCoding(uid, await parseBody(request, Body)));
}
