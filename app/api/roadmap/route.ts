// POST: (re)generate the roadmap. Code computes the budget; P5 sequences it (with a
// deterministic fallback), so this works without an LLM key.
import { getUserDoc } from "@/lib/data";
import { HttpError, withUser } from "@/lib/server/api";
import { generateRoadmap } from "@/lib/server/roadmap";

export async function POST() {
  return withUser(async (uid) => {
    const user = await getUserDoc(uid);
    if (user?.assessmentStatus !== "done") {
      throw new HttpError(400, "Take the Quick Assessment first.");
    }
    return generateRoadmap(uid, user.activeRoadmapId ? "manual" : "assessment");
  });
}
