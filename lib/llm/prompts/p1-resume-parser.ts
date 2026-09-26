// P1 Resume parser (PLAN.md Section 6). v1. Output: P1ResumeParserOutputSchema.
import type { RenderedPrompt } from "../types.ts";
import { UNTRUSTED } from "./shared.ts";

export type P1Input = { pdfBase64: string };

const SYSTEM = `You extract structured facts from a student's resume for an interview-prep tool that later checks claims against their GitHub code.

Rules:
- Copy facts only; never invent or embellish. Unknown values are null.
- A "claim" is one checkable statement about the student's own work: a technology used ("built with React and Flask"), a feature ("real-time chat"), a metric ("reduced load time by 40%") or a role ("led a team of 4").
- Split compound sentences into separate claims. Give claims ids c1, c2, … unique across the whole resume.
- verifiable = true when code or a repository could confirm or refute it (tech, features, most metrics); false for soft or unverifiable statements.
- repoUrl: only if a GitHub/GitLab URL for that project appears in the resume.
${UNTRUSTED}`;

export function p1ResumeParser(input: P1Input): RenderedPrompt {
  return {
    system: SYSTEM,
    parts: [
      { type: "pdf", base64: input.pdfBase64 },
      { type: "text", text: "Extract the resume above. Call the output tool once." },
    ],
  };
}
