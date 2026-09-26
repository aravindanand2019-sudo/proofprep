// GET: mock interview content: 10 round-1 MCQs (answer-free) and one coding problem.
import { getCodingProblems, getProjects, getQuestions } from "@/lib/data";
import { withUser } from "@/lib/server/api";
import { toPublic } from "@/lib/server/questions";

export async function GET() {
  return withUser(async (uid) => {
    const [questions, problems, projects] = await Promise.all([
      getQuestions("mock"),
      getCodingProblems(),
      getProjects(uid),
    ]);
    const problem = problems[Math.floor(Math.random() * problems.length)] ?? null;
    return {
      questions: questions.map(toPublic),
      problem,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        claims: p.claims.length,
        unsupported: p.claims.filter((c) => c.verdict === "unsupported").length,
      })),
    };
  });
}
