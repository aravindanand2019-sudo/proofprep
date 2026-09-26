import { PageHeader } from "@/components/kit";
import { getUserDoc } from "@/lib/data";
import { getSessionUid } from "@/lib/server/session";
import { ConnectForm } from "./connect-form";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const user = await getUserDoc((await getSessionUid()) ?? "");
  const links = user?.profile.links ?? {};
  return (
    <>
      <PageHeader
        title="Connect"
        description="Link your profiles and upload your resume. Project Defense uses them to check your claims."
      />
      <ConnectForm
        initial={{
          github: links.github ?? "",
          linkedin: links.linkedin ?? "",
          leetcode: links.leetcode ?? "",
        }}
        resumePath={user?.profile.resume?.storagePath ?? null}
      />
    </>
  );
}
