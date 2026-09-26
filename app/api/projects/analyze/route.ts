// POST { repoUrl, name?, claims? }: fetch a public repo → P2 (if no claims) → P3 → save.
import { z } from "zod";
import { parseBody, withUser } from "@/lib/server/api";
import { analyzeRepo } from "@/lib/server/projects";

const Body = z.object({
  repoUrl: z.string().trim().min(5).max(300),
  name: z.string().trim().max(100).optional(),
  claims: z
    .array(z.object({ id: z.string(), text: z.string() }))
    .max(30)
    .optional(),
});

export async function POST(request: Request) {
  return withUser(async (uid) => analyzeRepo(uid, await parseBody(request, Body)));
}
