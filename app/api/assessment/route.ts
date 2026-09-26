// GET: the fixed quick assessment (answer-free): 10 aptitude, 10 coding, 10 communication.
import { getCommPrompts, getQuestions } from "@/lib/data";
import { withUser } from "@/lib/server/api";
import { toPublic } from "@/lib/server/questions";

export async function GET() {
  return withUser(async () => {
    const [questions, prompts] = await Promise.all([getQuestions("assessment"), getCommPrompts()]);
    return {
      aptitude: questions.filter((q) => q.skillId.startsWith("apt-")).map(toPublic),
      coding: questions.filter((q) => q.skillId.startsWith("dsa-")).map(toPublic),
      communication: prompts.map((p) => ({
        id: p.id,
        text: p.text,
        kind: p.kind,
        targetDurationSec: p.targetDurationSec,
      })),
    };
  });
}
