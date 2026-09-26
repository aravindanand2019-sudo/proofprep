import { PageHeader } from "@/components/kit";
import { getCompanies, getUserDoc } from "@/lib/data";
import { DEFAULT_HOURS_PER_DAY } from "@/lib/schemas";
import { getSessionUid } from "@/lib/server/session";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function PersonalDetailsPage() {
  const uid = (await getSessionUid()) ?? "";
  const [user, companies] = await Promise.all([getUserDoc(uid), getCompanies()]);
  const p = user?.profile ?? {};
  return (
    <>
      <PageHeader
        title="Personal Details"
        description="Your target decides how readiness is weighted."
      />
      <ProfileForm
        companies={companies.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          name: user?.name ?? "",
          email: user?.email ?? "",
          targetRole: p.targetRole ?? "",
          targetCompanies: p.targetCompanies ?? [],
          placementDate: p.placementDate ? p.placementDate.toISOString().slice(0, 10) : "",
          hoursPerDay: p.hoursPerDay ?? DEFAULT_HOURS_PER_DAY,
        }}
      />
    </>
  );
}
