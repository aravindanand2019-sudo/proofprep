import { HttpError } from "./api";

const MAX_BYTES = 5 * 1024 * 1024;

/** Reads the "file" field of a multipart request as a PDF buffer. */
export async function readPdf(request: Request): Promise<Buffer> {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Attach a PDF file.");
  if (file.type !== "application/pdf") throw new HttpError(400, "Only PDF files are supported.");
  if (file.size > MAX_BYTES) throw new HttpError(400, "The PDF must be under 5 MB.");
  return Buffer.from(await file.arrayBuffer());
}
