// POST multipart { file }: P1 on the resume PDF → one project per resume project.
import { withUser } from "@/lib/server/api";
import { importResume } from "@/lib/server/projects";
import { readPdf } from "@/lib/server/upload";

export async function POST(request: Request) {
  return withUser(async (uid) => importResume(uid, await readPdf(request)));
}
