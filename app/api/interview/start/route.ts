// POST { projectId? , description? }: start a project-defense interview (P6).
import { z } from "zod";
import { parseBody, withUser } from "@/lib/server/api";
import { startDefense } from "@/lib/server/projects";

const Body = z.object({
  projectId: z.string().optional(),
  description: z.string().max(4000).optional(),
});

export async function POST(request: Request) {
  return withUser(async (uid) => startDefense(uid, await parseBody(request, Body)));
}
