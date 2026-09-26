// PUT: edit personal details (name, role, companies, placement date, hours per day).
import { z } from "zod";
import { getCompanies, updateProfile } from "@/lib/data";
import { MAX_TARGET_COMPANIES } from "@/lib/schemas";
import { HttpError, parseBody, withUser } from "@/lib/server/api";

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  targetRole: z.string().trim().min(2).max(80),
  targetCompanies: z.array(z.string()).min(1).max(MAX_TARGET_COMPANIES),
  placementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hoursPerDay: z.number().min(0.5).max(16),
});

export async function PUT(request: Request) {
  return withUser(async (uid) => {
    const body = await parseBody(request, Body);
    const known = new Set((await getCompanies()).map((c) => c.id));
    if (body.targetCompanies.some((id) => !known.has(id))) {
      throw new HttpError(400, "Unknown company.");
    }
    await updateProfile(
      uid,
      {
        targetRole: body.targetRole,
        targetCompanies: [...new Set(body.targetCompanies)],
        placementDate: new Date(`${body.placementDate}T00:00:00Z`),
        hoursPerDay: body.hoursPerDay,
      },
      { name: body.name },
    );
    return { ok: true };
  });
}
