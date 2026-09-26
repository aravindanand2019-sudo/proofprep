// Browser → API route helper. Session cookie auth; errors become readable messages.
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? (init.body !== undefined || init.form ? "POST" : "GET"),
    headers: init.form ? undefined : { "Content-Type": "application/json" },
    body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
