// P2 Claim extractor (PLAN.md Section 6). v1. Used when a project comes from GitHub only.
import type { RenderedPrompt } from "../types.ts";
import { block, text, UNTRUSTED } from "./shared.ts";

export type P2Input = { repoName: string; description: string | null; readme: string };

const SYSTEM = `You list the claims a repository's README makes about the project, so they can be checked against the code.
A claim is one checkable statement: a technology ("uses PostgreSQL"), a feature ("JWT login"), a metric ("handles 1k req/s") or a role ("built solo").
Split compound statements. ids are c1, c2, …. Return at most 12 claims, most important first. verifiable = true when the code could confirm it.
${UNTRUSTED}`;

export function p2ClaimExtractor(input: P2Input): RenderedPrompt {
  return text(
    SYSTEM,
    block("repo", { name: input.repoName, description: input.description }),
    block("readme", input.readme.slice(0, 12000)),
  );
}
