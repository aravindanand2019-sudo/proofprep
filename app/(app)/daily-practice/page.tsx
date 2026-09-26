import { PageHeader } from "@/components/kit";
import { PracticeTabs } from "./practice-tabs";

export default function DailyPracticePage() {
  return (
    <>
      <PageHeader
        title="Daily Practice"
        description="Three coding problems a day, picked for your domain and weakest skills: classics from LeetCode, Codeforces and HackerRank. Write the code, run the tests, submit."
      />
      <PracticeTabs />
    </>
  );
}
