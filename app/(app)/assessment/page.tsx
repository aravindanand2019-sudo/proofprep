import { PageHeader } from "@/components/kit";
import { AssessmentClient } from "./assessment-client";

export default function AssessmentPage() {
  return (
    <>
      <PageHeader
        title="Quick Assessment"
        description="10 aptitude, 10 coding and 10 communication questions. Mark how sure you are on each; it's how we tell a careless slip from a concept gap."
      />
      <AssessmentClient />
    </>
  );
}
