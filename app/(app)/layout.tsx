// Signed-in app shell: sidebar + content. proxy.ts already routes by onboarding state.
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { MobileNav, Sidebar } from "@/components/layout/sidebar";
import { getUserDoc } from "@/lib/data";
import { getSessionUid } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const uid = await getSessionUid();
  if (!uid) redirect("/");
  const user = await getUserDoc(uid);
  if (!user) redirect("/");

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar name={user.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
