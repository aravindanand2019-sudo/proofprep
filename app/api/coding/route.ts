// GET: today's coding problems for the user's domain, the full catalogue, and progress.
import { withUser } from "@/lib/server/api";
import { getDailyCoding } from "@/lib/server/coding";

export async function GET() {
  return withUser((uid) => getDailyCoding(uid));
}
