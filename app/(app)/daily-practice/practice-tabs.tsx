"use client";

import { useState } from "react";
import { CodingWorkspace } from "@/components/coding/coding-workspace";
import { PracticeClient } from "./practice-client";

const TABS = [
  { id: "coding", label: "Daily coding" },
  { id: "drill", label: "Concept drill (MCQ)" },
] as const;

export function PracticeTabs() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("coding");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 border-b" role="tablist" aria-label="Practice mode">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "coding" ? <CodingWorkspace /> : <PracticeClient />}
    </div>
  );
}
