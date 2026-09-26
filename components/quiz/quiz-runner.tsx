"use client";

import { Mic, Square, Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorAlert } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { Confidence } from "@/lib/schemas";
import { getRecognition, type Recognition } from "./speech";
import type {
  CommAnswerState,
  McqAnswerState,
  QuizItem,
  QuizSection,
  QuizSubmission,
} from "./types";

const CONFIDENCE: Array<[Confidence, string]> = [
  ["sure", "Sure"],
  ["likely", "Think so"],
  ["guess", "Guessing"],
];

type Props = {
  sections: QuizSection[];
  onSubmit: (submission: QuizSubmission) => Promise<void>;
  submitLabel?: string;
  /** Countdown for the whole quiz; auto-submits at 0. */
  timeLimitSec?: number;
};

function isAnswered(
  item: QuizItem,
  mcq: Record<string, McqAnswerState>,
  comm: Record<string, CommAnswerState>,
) {
  if (item.kind === "mcq") {
    const a = mcq[item.q.id];
    return a?.selectedIndex != null && a.confidence != null;
  }
  return (comm[item.q.id]?.transcript.trim().length ?? 0) > 0;
}

function fmtClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function QuizRunner({ sections, onSubmit, submitLabel = "Submit", timeLimitSec }: Props) {
  const flat = sections.flatMap((s) => s.items.map((item) => ({ section: s.id, item })));
  const [pos, setPos] = useState(0);
  const [mcq, setMcq] = useState<Record<string, McqAnswerState>>({});
  const [comm, setComm] = useState<Record<string, CommAnswerState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [left, setLeft] = useState(timeLimitSec ?? 0);
  const shownAt = useRef(0);
  const submitted = useRef(false);

  const current = flat[pos];

  // Per-question time: add elapsed time to the question being left.
  const flushTime = useCallback(() => {
    const cur = flat[pos];
    if (cur?.item.kind === "mcq") {
      const id = cur.item.q.id;
      const elapsed = (Date.now() - shownAt.current) / 1000;
      setMcq((m) => {
        const prev = m[id] ?? { selectedIndex: null, confidence: null, timeTakenSec: 0 };
        return { ...m, [id]: { ...prev, timeTakenSec: prev.timeTakenSec + elapsed } };
      });
    }
    shownAt.current = Date.now();
  }, [flat, pos]);

  const go = (next: number) => {
    if (next < 0 || next >= flat.length || next === pos) return;
    flushTime();
    setWarn(null);
    setPos(next);
  };

  const submit = useCallback(
    async (force = false) => {
      if (submitted.current) return;
      const unanswered = flat.filter(({ item }) => !isAnswered(item, mcq, comm)).length;
      if (unanswered > 0 && !force) {
        setWarn(`${unanswered} question(s) unanswered. Press Submit again to submit anyway.`);
        return;
      }
      submitted.current = true;
      flushTime();
      setSubmitting(true);
      setError(null);
      const submission: QuizSubmission = {
        mcq: flat.flatMap(({ item }) => {
          if (item.kind !== "mcq") return [];
          const a = mcq[item.q.id];
          return [
            {
              questionId: item.q.id,
              selectedIndex: a?.selectedIndex ?? null,
              confidence: a?.confidence ?? null,
              timeTakenSec: Math.round(a?.timeTakenSec ?? item.q.expectedTimeSec),
            },
          ];
        }),
        comm: flat.flatMap(({ item }) => {
          if (item.kind !== "comm") return [];
          const a = comm[item.q.id];
          return a?.transcript.trim()
            ? [{ promptId: item.q.id, transcript: a.transcript.trim(), durationSec: a.durationSec }]
            : [];
        }),
      };
      try {
        await onSubmit(submission);
      } catch (err) {
        submitted.current = false;
        setError(err instanceof Error ? err.message : "Submit failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [comm, flat, flushTime, mcq, onSubmit],
  );

  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  // Countdown with auto-submit.
  useEffect(() => {
    if (!timeLimitSec) return;
    const id = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => window.clearInterval(id);
  }, [timeLimitSec]);
  useEffect(() => {
    if (timeLimitSec && left <= 0 && !submitted.current) void submit(true);
  }, [left, submit, timeLimitSec]);

  if (!current) return <p className="text-muted-foreground">No questions.</p>;

  const sectionStats = sections.map((s) => ({
    ...s,
    done: s.items.filter((i) => isAnswered(i, mcq, comm)).length,
  }));
  const answeredTotal = sectionStats.reduce((n, s) => n + s.done, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Sections">
        {sectionStats.map((s) => {
          const first = flat.findIndex((f) => f.section === s.id);
          const active = current.section === s.id;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={active}
              onClick={() => go(first)}
              className={`rounded-md border px-3 py-1.5 text-sm ${active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {s.label} {s.done}/{s.items.length}
            </button>
          );
        })}
        {timeLimitSec ? (
          <span
            className={`ml-auto flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-sm tabular-nums ${left < 60 ? "border-destructive text-destructive" : ""}`}
            aria-live="polite"
          >
            <Timer className="size-4" aria-hidden /> {fmtClock(left)}
          </span>
        ) : null}
      </div>
      <Progress value={(100 * answeredTotal) / flat.length} aria-label="Answered" />

      <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
        <div className="flex flex-col gap-4 rounded-xl border p-5">
          <p className="text-muted-foreground text-sm">
            Question {pos + 1} of {flat.length}
          </p>
          {current.item.kind === "mcq" ? (
            <McqView
              key={current.item.q.id}
              item={current.item}
              state={mcq[current.item.q.id]}
              onChange={(next) =>
                setMcq((m) => ({
                  ...m,
                  [current.item.q.id]: {
                    selectedIndex: next.selectedIndex,
                    confidence: next.confidence,
                    timeTakenSec: m[current.item.q.id]?.timeTakenSec ?? 0,
                  },
                }))
              }
            />
          ) : (
            <CommView
              key={current.item.q.id}
              item={current.item}
              state={comm[current.item.q.id]}
              onChange={(next) => setComm((c) => ({ ...c, [current.item.q.id]: next }))}
            />
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <Button variant="outline" onClick={() => go(pos - 1)} disabled={pos === 0}>
              Previous
            </Button>
            {pos < flat.length - 1 ? (
              <Button onClick={() => go(pos + 1)}>Next</Button>
            ) : (
              <Button onClick={() => void submit(Boolean(warn))} disabled={submitting}>
                {submitting ? "Submitting..." : submitLabel}
              </Button>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <p className="text-sm font-medium">Questions</p>
          <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5" aria-label="Question palette">
            {flat.map(({ item }, i) => {
              const done = isAnswered(item, mcq, comm);
              return (
                <button
                  key={item.q.id}
                  onClick={() => go(i)}
                  aria-label={`Question ${i + 1}${done ? ", answered" : ""}`}
                  className={`h-8 rounded-md border text-xs tabular-nums ${i === pos ? "ring-primary ring-2" : ""} ${done ? "border-emerald-500 bg-emerald-500/15" : "hover:bg-muted"}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <p className="text-muted-foreground text-xs">Green = answered.</p>
          <Button
            onClick={() => void submit(Boolean(warn))}
            disabled={submitting}
            variant="secondary"
          >
            {submitting ? "Submitting..." : submitLabel}
          </Button>
        </aside>
      </div>

      {warn && <ErrorAlert message={warn} />}
      {error && <ErrorAlert message={error} onRetry={() => void submit(true)} />}
    </div>
  );
}

function McqView({
  item,
  state,
  onChange,
}: {
  item: Extract<QuizItem, { kind: "mcq" }>;
  state: McqAnswerState | undefined;
  onChange: (s: { selectedIndex: number | null; confidence: Confidence | null }) => void;
}) {
  const selected = state?.selectedIndex ?? null;
  const confidence = state?.confidence ?? null;
  const isCode = item.q.prompt.includes("\n");
  return (
    <div className="flex flex-col gap-4">
      <p className={isCode ? "font-mono text-sm whitespace-pre-wrap" : "text-base"}>
        {item.q.prompt}
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Options</legend>
        {item.q.options.map((opt, i) => (
          <label
            key={i}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${selected === i ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
          >
            <input
              type="radio"
              name={item.q.id}
              checked={selected === i}
              onChange={() => onChange({ selectedIndex: i, confidence })}
              className="mt-0.5"
            />
            <span className="whitespace-pre-wrap">{opt}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">How sure are you?</span>
        {CONFIDENCE.map(([value, text]) => (
          <button
            key={value}
            type="button"
            aria-pressed={confidence === value}
            onClick={() => onChange({ selectedIndex: selected, confidence: value })}
            className={`rounded-full border px-3 py-1 text-sm ${confidence === value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {text}
          </button>
        ))}
      </div>
      {selected !== null && confidence === null && (
        <p className="text-sm text-amber-600">Pick a confidence level to record this answer.</p>
      )}
    </div>
  );
}

function CommView({
  item,
  state,
  onChange,
}: {
  item: Extract<QuizItem, { kind: "comm" }>;
  state: CommAnswerState | undefined;
  onChange: (s: CommAnswerState) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [supported] = useState(() => typeof window !== "undefined" && getRecognition() !== null);
  const rec = useRef<Recognition | null>(null);
  const transcript = state?.transcript ?? "";
  const latest = useRef({ transcript, durationSec: state?.durationSec ?? null });

  useEffect(() => {
    latest.current = { transcript, durationSec: state?.durationSec ?? null };
  }, [transcript, state?.durationSec]);
  useEffect(() => () => rec.current?.stop(), []);

  function start() {
    const r = getRecognition();
    if (!r) return;
    setMicError(null);
    const prefix = latest.current.transcript ? `${latest.current.transcript} ` : "";
    const prevDuration = latest.current.durationSec ?? 0;
    const startedAt = Date.now();
    let spokenText = "";
    r.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i]?.[0]?.transcript ?? "";
      }
      spokenText = text;
      onChange({ transcript: prefix + text, durationSec: prevDuration || null });
    };
    r.onerror = (e) =>
      setMicError(
        e.error === "not-allowed"
          ? "Microphone blocked. You can type instead."
          : `Mic error: ${e.error}`,
      );
    r.onend = () => {
      setRecording(false);
      const spoken = (Date.now() - startedAt) / 1000;
      onChange({
        transcript: prefix + spokenText,
        durationSec: spokenText ? prevDuration + spoken : prevDuration || null,
      });
    };
    rec.current = r;
    r.start();
    setRecording(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          {item.q.kind} · aim for about {Math.round((item.q.targetDurationSec / 60) * 10) / 10} min
        </p>
        <p className="mt-1 text-base">{item.q.text}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {item.q.kind === "behavioral"
            ? "Structure: Situation → Task → Action → Result."
            : "Structure: Claim → Reason → Example."}
        </p>
      </div>
      <Textarea
        rows={7}
        value={transcript}
        onChange={(e) =>
          onChange({ transcript: e.target.value, durationSec: state?.durationSec ?? null })
        }
        placeholder={
          supported ? "Type your answer, or press the mic and speak." : "Type your answer."
        }
        aria-label="Your answer"
      />
      <div className="flex flex-wrap items-center gap-3">
        {supported ? (
          recording ? (
            <Button variant="destructive" onClick={() => rec.current?.stop()}>
              <Square className="size-4" aria-hidden /> Stop
            </Button>
          ) : (
            <Button variant="outline" onClick={start}>
              <Mic className="size-4" aria-hidden /> Speak
            </Button>
          )
        ) : (
          <span className="text-muted-foreground text-sm">
            Voice input isn&apos;t supported in this browser; type your answer.
          </span>
        )}
        <span className="text-muted-foreground text-sm">
          {transcript.trim() ? transcript.trim().split(/\s+/).length : 0} words
          {state?.durationSec ? ` · ${Math.round(state.durationSec)} s spoken` : ""}
        </span>
      </div>
      {micError && <ErrorAlert message={micError} />}
    </div>
  );
}
