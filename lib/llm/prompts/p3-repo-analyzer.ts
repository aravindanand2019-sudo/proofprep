// P3 Repo analyzer (PLAN.md Section 6). v1. Output: P3RepoAnalyzerOutputSchema.
import type { RenderedPrompt } from "../types.ts";
import { block, text, UNTRUSTED } from "./shared.ts";

export type P3Input = {
  repo: { name: string; description: string | null; languages: Record<string, number> };
  tree: string;
  readme: string;
  files: Array<{ path: string; content: string }>;
  claims: Array<{ id: string; text: string }>;
};

const SYSTEM = `You are a senior engineer auditing a student's project before a technical interview. You receive the repository's file tree, README, and up to 8 key source files, plus the claims the student makes about the project.

For EVERY claim, return exactly one verdict:
- "supported": the provided code clearly implements it. Cite the files (path, and line ranges if you can, e.g. "src/app.py:40-72").
- "partial": some evidence, but weaker than claimed (e.g. claimed "real-time", code polls every 30 s).
- "unsupported": the provided files contradict it or show no trace where you would expect one.
- "unverified": the claim is about something the provided files cannot show (metrics, teamwork, files not included).
Be fair: absence from 8 files is "unverified" unless the file tree itself makes the claim implausible.

Also return:
- summary: 2–3 sentences on what the project does and how.
- stackDetected: languages, frameworks, databases, notable libraries.
- architecture: 1–2 sentences.
- complexity: 1 (tutorial-level) to 5 (production-grade).
- redFlags: copied boilerplate, secrets in code, dead features, mismatched README; empty if none.
- interviewHooks: 3–5 specific things an interviewer should probe (a design choice, a tricky function, a weak claim), each with the file it lives in (or null).
${UNTRUSTED}`;

export function p3RepoAnalyzer(input: P3Input): RenderedPrompt {
  return text(
    SYSTEM,
    block("repo", input.repo),
    block("file_tree", input.tree.slice(0, 6000)),
    block("readme", input.readme.slice(0, 8000)),
    ...input.files.map((f) => block(`file path="${f.path}"`, f.content.slice(0, 12000))),
    block("claims", input.claims),
  );
}
