import { PageHeader } from "@/components/kit";
import { getProjects } from "@/lib/data";
import { getSessionUid } from "@/lib/server/session";
import { ProjectsClient, type ProjectView } from "./projects-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjects((await getSessionUid()) ?? "");
  const views: ProjectView[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    source: p.source,
    repoUrl: p.repoUrl ?? null,
    summary: p.summary,
    stack: p.stackDetected,
    claims: p.claims,
    hooks: p.interviewHooks,
    defenseScore: p.defenseScore ?? null,
  }));
  return (
    <>
      <PageHeader
        title="Projects"
        description="We read your code and check every resume claim against it: supported, partial, unsupported or unverified. Mock Interview then questions you on the weak ones."
      />
      <ProjectsClient projects={views} />
    </>
  );
}
