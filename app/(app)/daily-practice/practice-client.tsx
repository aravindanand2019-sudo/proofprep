"use client";

import { useEffect, useState } from "react";
import { ErrorAlert, Spinner } from "@/components/kit";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { SessionResults } from "@/components/quiz/session-results";
import type { PublicQ, QuizSubmission, SessionResultView } from "@/components/quiz/types";

type PracticeSection = { id: string; label: string; questions: PublicQ[] };
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/client/api";

export function PracticeClient() {
  const [sections, setSections] = useState<PracticeSection[] | null>(null);
  const questions = sections?.flatMap((s) => s.questions) ?? null;
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(SessionResultView & { resolvedMistakes: number }) | null>(
    null,
  );
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<{ sections: PracticeSection[] }>("/api/practice").then(
      (data) => {
        if (cancelled) return;
        setError(null);
        setSections(data.sections);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [round]);

  function another() {
    setSections(null);
    setResult(null);
    setRound((r) => r + 1);
  }

  if (error) return <ErrorAlert message={error} onRetry={another} />;
  if (!questions) return <Spinner label="Picking your questions..." />;

  if (result) {
    return (
      <>
        {result.resolvedMistakes > 0 && (
          <p className="text-sm text-emerald-600">
            {result.resolvedMistakes} open mistake(s) resolved.
          </p>
        )}
        <SessionResults
          result={result}
          questions={new Map(questions.map((q) => [q.id, q]))}
          next={{ href: "/progress", label: "See your progress" }}
        />
        <Button variant="outline" className="self-start" onClick={another}>
          Practise another set
        </Button>
      </>
    );
  }

  async function submit(s: QuizSubmission) {
    setResult(
      await api<SessionResultView & { resolvedMistakes: number }>("/api/practice/submit", {
        body: { answers: s.mcq },
      }),
    );
    window.scrollTo({ top: 0 });
  }

  return (
    <QuizRunner
      key={round}
      sections={(sections ?? []).map((s) => ({
        id: s.id,
        label: s.label,
        items: s.questions.map((q) => ({ kind: "mcq" as const, q })),
      }))}
      onSubmit={submit}
      submitLabel="Finish practice"
    />
  );
}
