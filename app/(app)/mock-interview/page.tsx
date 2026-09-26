import { PageHeader } from "@/components/kit";
import { MockInterviewClient } from "./mock-client";

export default function MockInterviewPage() {
  return (
    <>
      <PageHeader
        title="Mock Interview"
        description="Round 1: technical & aptitude (10 min) · Round 2: coding (20 min, AI-reviewed) · Round 3: project defense."
      />
      <MockInterviewClient />
    </>
  );
}
