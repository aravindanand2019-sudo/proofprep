// GET: today's practice set: coding patterns for the user's domain + weakest skills.
import { withUser } from "@/lib/server/api";
import { pickPracticeSections, toPublic } from "@/lib/server/questions";

export async function GET() {
  return withUser(async (uid) => {
    const { domain, domainLabel, patterns, weak } = await pickPracticeSections(uid);
    return {
      domain,
      sections: [
        {
          id: "patterns",
          label: `Coding patterns · ${domainLabel}`,
          questions: patterns.map(toPublic),
        },
        { id: "weak", label: "Your weak spots", questions: weak.map(toPublic) },
      ].filter((s) => s.questions.length > 0),
    };
  });
}
