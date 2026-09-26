// Registry of prompt templates. The key is the promptId passed to llm.call().
import type { RenderedPrompt } from "../types.ts";
import { pCode } from "./p-code.ts";
import { pGap } from "./p-gap.ts";
import { p1ResumeParser } from "./p1-resume-parser.ts";
import { p2ClaimExtractor } from "./p2-claim-extractor.ts";
import { p3RepoAnalyzer } from "./p3-repo-analyzer.ts";
import { p4MistakeClassifier } from "./p4-mistake-classifier.ts";
import { p5RoadmapGenerator } from "./p5-roadmap-generator.ts";
import { p6Interviewer } from "./p6-interviewer.ts";
import { p7AnswerEvaluator } from "./p7-answer-evaluator.ts";
import { p8CommScorer } from "./p8-comm-scorer.ts";
import { p9ReRecordCompare } from "./p9-rerecord-compare.ts";

export const prompts = {
  "p1-resume-parser": p1ResumeParser,
  "p2-claim-extractor": p2ClaimExtractor,
  "p3-repo-analyzer": p3RepoAnalyzer,
  "p4-mistake-classifier": p4MistakeClassifier,
  "p5-roadmap-generator": p5RoadmapGenerator,
  "p6-interviewer": p6Interviewer,
  "p7-answer-evaluator": p7AnswerEvaluator,
  "p8-comm-scorer": p8CommScorer,
  "p9-rerecord-compare": p9ReRecordCompare,
  "p-gap": pGap,
  "p-code": pCode,
} satisfies Record<string, (input: never) => RenderedPrompt>;

export type PromptId = keyof typeof prompts;
export type PromptInput<P extends PromptId> = Parameters<(typeof prompts)[P]>[0];
