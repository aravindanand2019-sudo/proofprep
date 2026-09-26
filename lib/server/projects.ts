// Project Defense: GitHub/resume → claims → P3 verdicts; and the P6/P7 interview loop.
import { getAdminStorage } from "@/lib/firebase/admin";
import {
  getInterviewSession,
  getProject,
  saveInterviewSession,
  saveProject,
  setProjectDefenseScore,
  updateProfile,
} from "@/lib/data";
import {
  P1ResumeParserOutputSchema,
  P2ClaimExtractorOutputSchema,
  P3RepoAnalyzerOutputSchema,
  P6InterviewerOutputSchema,
  P7AnswerEvaluatorOutputSchema,
  type InterviewSession,
  type Project,
  type ProjectClaim,
  type WithId,
} from "@/lib/schemas";
import { HttpError } from "./api";
import { fetchRepo, GitHubError } from "./github";
import { tryLlm } from "./llm";
import { recordSnapshots } from "./readiness";

export const DEFENSE_QUESTIONS = 5;

type ClaimInput = { id: string; text: string };

function unverified(claims: ClaimInput[]): ProjectClaim[] {
  return claims.map((c) => ({
    id: c.id,
    text: c.text,
    verdict: "unverified",
    evidence: "Not checked against code.",
    fileRefs: [],
  }));
}

/** Analyzes a public repo. If GitHub fails and claims were given, saves resume-only instead. */
export async function analyzeRepo(
  uid: string,
  input: { repoUrl: string; name?: string; claims?: ClaimInput[] },
): Promise<{ projectId: string; warning: string | null }> {
  let repo;
  try {
    repo = await fetchRepo(input.repoUrl);
  } catch (error) {
    const message = error instanceof GitHubError ? error.message : "GitHub fetch failed.";
    if (input.claims?.length) {
      const projectId = await saveProject(uid, {
        source: "resume",
        repoUrl: input.repoUrl,
        name: input.name ?? "Project",
        summary: "Saved from your resume; the repository could not be read.",
        stackDetected: [],
        claims: unverified(input.claims),
        interviewHooks: [],
        analyzedAt: new Date(),
      });
      return {
        projectId,
        warning: `${message} Saved from your resume with claims marked unverified.`,
      };
    }
    throw new HttpError(422, message);
  }

  let claims = input.claims ?? [];
  if (claims.length === 0) {
    const extracted = await tryLlm(
      "p2-claim-extractor",
      { repoName: repo.name, description: repo.description, readme: repo.readme },
      P2ClaimExtractorOutputSchema,
      { model: "fast" },
    );
    if (!extracted.ok) throw new HttpError(503, extracted.error);
    claims = extracted.data.claims.map((c) => ({ id: c.id, text: c.text }));
  }

  const analysis = await tryLlm(
    "p3-repo-analyzer",
    {
      repo: { name: repo.name, description: repo.description, languages: repo.languages },
      tree: repo.tree,
      readme: repo.readme,
      files: repo.files,
      claims,
    },
    P3RepoAnalyzerOutputSchema,
  );
  if (!analysis.ok) throw new HttpError(503, analysis.error);

  const verdicts = new Map(analysis.data.claimVerdicts.map((v) => [v.claimId, v]));
  const project: Project = {
    source: "github",
    repoUrl: repo.url,
    name: input.name ?? repo.name,
    summary: analysis.data.summary,
    stackDetected: analysis.data.stackDetected,
    claims: claims.map((c) => {
      const v = verdicts.get(c.id);
      return {
        id: c.id,
        text: c.text,
        verdict: v?.verdict ?? "unverified",
        evidence: v?.evidence ?? "No verdict returned.",
        fileRefs: v?.fileRefs ?? [],
      };
    }),
    interviewHooks: analysis.data.interviewHooks,
    analyzedAt: new Date(),
  };
  return { projectId: await saveProject(uid, project), warning: null };
}

/** Stores the PDF (best effort), runs P1, and saves each resume project as unverified. */
export async function importResume(
  uid: string,
  pdf: Buffer,
): Promise<{
  projects: Array<{
    projectId: string;
    name: string;
    repoUrl: string | null;
    claims: ClaimInput[];
  }>;
  storageWarning: string | null;
}> {
  let storageWarning: string | null = null;
  try {
    const path = `users/${uid}/resume.pdf`;
    await getAdminStorage().bucket().file(path).save(pdf, { contentType: "application/pdf" });
    await updateProfile(uid, { resume: { storagePath: path, parsedAt: new Date() } });
  } catch {
    storageWarning = "Resume parsed but not stored: Firebase Storage isn't set up.";
  }

  const parsed = await tryLlm(
    "p1-resume-parser",
    { pdfBase64: pdf.toString("base64") },
    P1ResumeParserOutputSchema,
  );
  if (!parsed.ok) throw new HttpError(503, parsed.error);

  const projects = await Promise.all(
    parsed.data.projects.map(async (p) => {
      const claims = p.claims.map((c) => ({ id: c.id, text: c.text }));
      const projectId = await saveProject(uid, {
        source: "resume",
        ...(p.repoUrl ? { repoUrl: p.repoUrl } : {}),
        name: p.name || "Untitled project",
        summary: p.description,
        stackDetected: [],
        claims: unverified(claims),
        interviewHooks: [],
        analyzedAt: new Date(),
      });
      return { projectId, name: p.name, repoUrl: p.repoUrl, claims };
    }),
  );
  return { projects, storageWarning };
}

function projectContext(project: WithId<Project>) {
  return {
    name: project.name,
    summary: project.summary,
    stack: project.stackDetected,
    claims: project.claims.map((c) => ({
      id: c.id,
      text: c.text,
      verdict: c.verdict,
      evidence: c.evidence,
    })),
    hooks: project.interviewHooks,
  };
}

async function nextQuestion(project: WithId<Project>, session: InterviewSession) {
  const history = session.turns
    .filter((t) => t.answer !== null)
    .map((t) => ({ question: t.question, answer: t.answer ?? "" }));
  const ai = await tryLlm(
    "p6-interviewer",
    { project: projectContext(project), history, maxQuestions: DEFENSE_QUESTIONS },
    P6InterviewerOutputSchema,
  );
  if (!ai.ok) throw new HttpError(503, ai.error);
  return ai.data;
}

export async function startDefense(
  uid: string,
  input: { projectId?: string; description?: string },
): Promise<{ sessionId: string; projectId: string; question: string; index: number }> {
  let projectId = input.projectId;
  if (!projectId) {
    if (!input.description?.trim()) throw new HttpError(400, "Pick a project or describe one.");
    projectId = await saveProject(uid, {
      source: "resume",
      name: "Described project",
      summary: input.description.trim().slice(0, 4000),
      stackDetected: [],
      claims: [],
      interviewHooks: [],
      analyzedAt: new Date(),
    });
  }
  const project = await getProject(uid, projectId);
  if (!project) throw new HttpError(404, "Project not found.");

  const session: InterviewSession = {
    mode: "project_defense",
    projectId,
    turns: [],
    status: "in_progress",
    createdAt: new Date(),
  };
  const q = await nextQuestion(project, session);
  session.turns.push({ question: q.question, intent: q.intent, answer: null });
  const sessionId = await saveInterviewSession(uid, session);
  return { sessionId, projectId, question: q.question, index: 0 };
}

export type DefenseReport = {
  score: number;
  strengths: string[];
  gaps: string[];
  turns: Array<{ question: string; answer: string; score: number; gaps: string[] }>;
};

export async function answerDefense(
  uid: string,
  input: { sessionId: string; answer: string },
): Promise<
  | { done: false; question: string; index: number }
  | { done: true; report: DefenseReport; projectId: string | null }
> {
  const stored = await getInterviewSession(uid, input.sessionId);
  if (!stored || stored.status !== "in_progress") throw new HttpError(404, "Interview not found.");
  const { id: sessionId, ...session } = stored;
  const project = session.projectId ? await getProject(uid, session.projectId) : null;
  if (!project) throw new HttpError(404, "Project not found.");

  const last = session.turns[session.turns.length - 1];
  if (!last || last.answer !== null) throw new HttpError(409, "No open question.");
  last.answer = input.answer.trim().slice(0, 4000) || "(no answer)";

  const answered = session.turns.filter((t) => t.answer !== null).length;
  if (answered < DEFENSE_QUESTIONS) {
    const q = await nextQuestion(project, session);
    if (!q.endInterview) {
      session.turns.push({ question: q.question, intent: q.intent, answer: null });
      await saveInterviewSession(uid, session, sessionId);
      return { done: false, question: q.question, index: session.turns.length - 1 };
    }
  }

  const evaluation = await tryLlm(
    "p7-answer-evaluator",
    {
      project: {
        name: project.name,
        summary: project.summary,
        claims: project.claims.map((c) => ({ id: c.id, text: c.text, verdict: c.verdict })),
      },
      turns: session.turns.map((t) => ({
        question: t.question,
        intent: t.intent,
        answer: t.answer ?? "",
      })),
    },
    P7AnswerEvaluatorOutputSchema,
  );
  if (!evaluation.ok) {
    await saveInterviewSession(uid, session, sessionId);
    throw new HttpError(503, evaluation.error);
  }
  for (const turnEval of evaluation.data.turns) {
    const turn = session.turns[turnEval.index];
    if (turn) {
      const { index: _i, ...rest } = turnEval;
      turn.eval = rest;
    }
  }
  session.overall = evaluation.data.overall;
  session.status = "completed";
  await saveInterviewSession(uid, session, sessionId);
  await setProjectDefenseScore(uid, project.id, evaluation.data.overall.score);
  await recordSnapshots(uid, "interview");

  return {
    done: true,
    projectId: project.id,
    report: {
      score: evaluation.data.overall.score,
      strengths: evaluation.data.overall.strengths,
      gaps: evaluation.data.overall.gaps,
      turns: session.turns.map((t) => ({
        question: t.question,
        answer: t.answer ?? "",
        score: t.eval
          ? (t.eval.scores.correctness + t.eval.scores.depth + t.eval.scores.clarity) / 3
          : 0,
        gaps: t.eval?.gaps ?? [],
      })),
    },
  };
}
