// Route-handler plumbing: auth, body parsing and error mapping in one place.
import { NextResponse } from "next/server";
import type { z } from "zod";
import { errorResponse, requireUid, UnauthorizedError } from "./session";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(400, issue ? `${issue.path.join(".")}: ${issue.message}` : "Bad request");
  }
  return parsed.data;
}

/** Runs `fn` with the signed-in uid and returns its result as JSON. */
export async function withUser(fn: (uid: string) => Promise<unknown>): Promise<NextResponse> {
  try {
    const uid = await requireUid();
    return NextResponse.json(await fn(uid));
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof UnauthorizedError) return errorResponse(error);
    return errorResponse(error);
  }
}
