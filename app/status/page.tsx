// /status: confirms Firebase is wired up (Admin SDK on the server, client SDK in the browser).
import { FirebaseClientStatus } from "@/components/firebase-client-status";
import { StatusRow, type Status } from "@/components/status-row";
import { getAdminDb } from "@/lib/firebase/admin";

// Check on every request, never at build time.
export const dynamic = "force-dynamic";

async function checkAdmin(): Promise<{ status: Status; detail: string }> {
  try {
    const db = getAdminDb();
    const [skills, companies] = await Promise.all([
      db.collection("skills").count().get(),
      db.collection("companies").count().get(),
    ]);
    const skillCount = skills.data().count;
    const companyCount = companies.data().count;
    if (skillCount === 0 || companyCount === 0) {
      return { status: "warn", detail: "Connected, but seed data is missing. Run npm run seed." };
    }
    return {
      status: "ok",
      detail: `Connected. ${skillCount} skills, ${companyCount} companies seeded.`,
    };
  } catch (error) {
    return { status: "error", detail: error instanceof Error ? error.message : String(error) };
  }
}

export default async function StatusPage() {
  const admin = await checkAdmin();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">ProofPrep</h1>
      <p className="text-muted-foreground mt-2">
        Foundation build. This page only checks that Firebase is connected.
      </p>
      <ul className="divide-border mt-8 divide-y rounded-lg border px-4">
        <StatusRow label="Firebase Admin SDK (server)" {...admin} />
        <FirebaseClientStatus />
      </ul>
    </main>
  );
}
