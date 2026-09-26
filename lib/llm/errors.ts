import type { z } from "zod";

export type LlmErrorKind =
  | "config" // missing env, unknown provider, schema not representable
  | "not_implemented" // prompt template still a stub
  | "provider" // API/network error after the SDK's own retries
  | "refusal" // model declined
  | "truncated" // hit max_tokens before finishing the output
  | "no_output" // model did not produce the structured output
  | "validation"; // output failed the Zod schema twice

export class LlmError extends Error {
  readonly kind: LlmErrorKind;
  readonly promptId: string;
  readonly issues: z.core.$ZodIssue[];

  constructor(
    kind: LlmErrorKind,
    promptId: string,
    message: string,
    options: { cause?: unknown; issues?: z.core.$ZodIssue[] } = {},
  ) {
    super(`[${promptId}] ${message}`, { cause: options.cause });
    this.name = "LlmError";
    this.kind = kind;
    this.promptId = promptId;
    this.issues = options.issues ?? [];
  }
}
