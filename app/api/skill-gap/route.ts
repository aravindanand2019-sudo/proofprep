// POST: generate P-GAP suggestions for the signed-in user and save them.
import { withUser } from "@/lib/server/api";
import { generateSuggestions } from "@/lib/server/skillGap";

export async function POST() {
  return withUser(async (uid) => ({ report: await generateSuggestions(uid) }));
}
