// PUT: save GitHub / LinkedIn / LeetCode links.
import { z } from "zod";
import { updateProfile } from "@/lib/data";
import { parseBody, withUser } from "@/lib/server/api";

const link = z
  .string()
  .trim()
  .max(200)
  .transform((v) => v || undefined)
  .optional();

const Body = z.object({ github: link, linkedin: link, leetcode: link });

export async function PUT(request: Request) {
  return withUser(async (uid) => {
    const links = await parseBody(request, Body);
    await updateProfile(uid, {
      links: Object.fromEntries(Object.entries(links).filter(([, v]) => v !== undefined)),
    });
    return { ok: true };
  });
}
