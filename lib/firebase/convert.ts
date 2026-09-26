// Firestore (Admin SDK) → app shapes: Timestamps become Dates, then Zod validates.
import { Timestamp } from "firebase-admin/firestore";
import type { z } from "zod";

function timestampsToDates(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(timestampsToDates);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) out[key] = timestampsToDates(inner);
    return out;
  }
  return value;
}

/** Parses Firestore document data with a schema, converting Timestamps first. */
export function fromFirestore<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(timestampsToDates(data));
}
