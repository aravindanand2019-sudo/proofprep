// POST multipart { file }: store the resume PDF in Firebase Storage; save only its path.
import { updateProfile } from "@/lib/data";
import { getAdminStorage } from "@/lib/firebase/admin";
import { HttpError, withUser } from "@/lib/server/api";
import { readPdf } from "@/lib/server/upload";

export async function POST(request: Request) {
  return withUser(async (uid) => {
    const pdf = await readPdf(request);
    const path = `users/${uid}/resume.pdf`;
    try {
      await getAdminStorage().bucket().file(path).save(pdf, { contentType: "application/pdf" });
    } catch {
      throw new HttpError(
        503,
        "Firebase Storage isn't set up for this project, so the file couldn't be saved.",
      );
    }
    await updateProfile(uid, { resume: { storagePath: path, parsedAt: null } });
    return { storagePath: path };
  });
}
