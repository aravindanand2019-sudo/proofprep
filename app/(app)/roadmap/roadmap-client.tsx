"use client";

import { CheckCircle2, Circle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorAlert, Spinner } from "@/components/kit";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, errorMessage } from "@/lib/client/api";

export type TaskView = {
  id: string;
  title: string;
  kind: string;
  skillName: string | null;
  targetsMistakeType: string | null;
  estMinutes: number;
  dueDate: string;
  status: "todo" | "done" | "skipped";
};

const KIND_TEXT: Record<string, string> = {
  learn: "Learn",
  drill: "Mixed drill",
  timed_drill: "Timed drill",
  calibration: "Calibration",
  comm_drill: "Communication",
  mock_interview: "Mock interview",
  project_defense: "Project defense",
};

const HREF: Record<string, string> = {
  comm_drill: "/assessment",
  mock_interview: "/mock-interview",
  project_defense: "/mock-interview",
};

const dayKey = (iso: string) => iso.slice(0, 10);

export function RoadmapClient({
  tasks: initial,
  rationale,
  weeks,
  hoursPerDay,
}: {
  tasks: TaskView[];
  rationale: string | null;
  weeks: Array<{ week: number; focus: string }>;
  hoursPerDay: number;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ usedAi: boolean; note: string | null }>("/api/roadmap", { body: {} });
      setNote(res.usedAi ? null : `Planned without AI${res.note ? `: ${res.note}` : "."}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(task: TaskView) {
    const status = task.status === "done" ? "todo" : "done";
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await api(`/api/roadmap/tasks/${task.id}`, { method: "PATCH", body: { status } });
    } catch (err) {
      setTasks((ts) => ts.map((t) => (t.id === task.id ? task : t)));
      setError(errorMessage(err));
    }
  }

  const today = dayKey(new Date().toISOString());
  const todayTasks = tasks.filter((t) => dayKey(t.dueDate) === today && t.status !== "skipped");
  const days = [...new Set(tasks.map((t) => dayKey(t.dueDate)))].sort();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-2xl text-sm">
          {rationale ?? "No plan yet. Generate one from your latest results."}
        </p>
        <Button onClick={regenerate} disabled={busy}>
          <RefreshCw className="size-4" aria-hidden />
          {tasks.length ? "Regenerate plan" : "Generate plan"}
        </Button>
      </div>
      {busy && <Spinner label="Building your plan..." />}
      {note && <p className="text-muted-foreground text-xs">{note}</p>}
      {error && <ErrorAlert message={error} />}

      {tasks.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">
            Today · {todayTasks.reduce((s, t) => s + t.estMinutes, 0)} of {hoursPerDay * 60} min
          </h2>
          {todayTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing scheduled today.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {todayTasks.map((t) => (
                <Card key={t.id} className={t.status === "done" ? "opacity-60" : undefined}>
                  <CardHeader>
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    <CardDescription>
                      {t.targetsMistakeType
                        ? `Because most of your ${t.skillName ?? ""} mistakes are ${t.targetsMistakeType}.`
                        : `Builds ${t.skillName ?? "this skill"} toward your companies' bar.`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-2">
                    <Badge variant="secondary">{KIND_TEXT[t.kind] ?? t.kind}</Badge>
                    <div className="flex gap-2">
                      <Link
                        href={HREF[t.kind] ?? "/daily-practice"}
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                      >
                        Start
                      </Link>
                      <Button size="sm" onClick={() => toggle(t)}>
                        {t.status === "done" ? "Undo" : "Done"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {weeks.map((w, wi) => {
        const weekDays = days.slice(wi * 7, wi * 7 + 7);
        if (weekDays.length === 0) return null;
        return (
          <section key={w.week} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">
              Week {w.week} · <span className="text-muted-foreground font-normal">{w.focus}</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {weekDays.map((d) => (
                <div key={d} className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-medium">
                    {new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {tasks
                      .filter((t) => dayKey(t.dueDate) === d && t.status !== "skipped")
                      .map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => toggle(t)}
                            className="flex w-full items-start gap-2 text-left text-sm"
                            aria-pressed={t.status === "done"}
                          >
                            {t.status === "done" ? (
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                            ) : (
                              <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                            )}
                            <span className={t.status === "done" ? "line-through opacity-60" : ""}>
                              {t.title}
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
