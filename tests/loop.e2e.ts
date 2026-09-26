// End-to-end loop against real Firestore (needs .env.local). Run: npm run test:e2e
// assessment → skill gap → roadmap → daily practice → readiness/progress.
import { afterAll, describe, expect, it } from "vitest";

process.loadEnvFile(".env.local");

const UID = `e2e-${Date.now()}`;

describe("core loop", async () => {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const data = await import("@/lib/data");
  const { processSession } = await import("@/lib/server/pipeline");
  const { generateRoadmap } = await import("@/lib/server/roadmap");
  const { pickPracticeSet } = await import("@/lib/server/questions");
  const { loadSkillGap } = await import("@/lib/server/skillGap");

  const userRef = getAdminDb().collection("users").doc(UID);
  await userRef.set({
    name: "E2E Student",
    email: "e2e@proofprep.app",
    photoURL: null,
    createdAt: new Date(),
    lastActiveAt: new Date(),
    onboardingStep: "assessment",
    assessmentStatus: "none",
    profile: {
      targetRole: "Software Development Engineer",
      targetCompanies: ["amazon-sde", "tcs-nqt"],
      placementDate: new Date(Date.now() + 60 * 864e5),
      hoursPerDay: 2,
      links: {},
    },
    readiness: {},
  });

  afterAll(async () => {
    await getAdminDb().recursiveDelete(userRef);
  });

  it("brand-new user: readiness is 0 with low confidence, nothing crashes", async () => {
    const gap = await loadSkillGap(UID);
    expect(gap.hasData).toBe(false);
    expect(gap.reports.every((r) => r.report.score === 0 && r.report.confidence === "low")).toBe(
      true,
    );
    expect(await pickPracticeSet(UID)).toHaveLength(10);
  });

  it("assessment writes attempts, mistakes, skill states and snapshots", async () => {
    const qs = await data.getQuestions("assessment");
    // Correct on aptitude, a fast wrong answer on each coding question.
    const answers = qs.map((q) => ({
      questionId: q.id,
      selectedIndex: q.skillId.startsWith("apt-")
        ? (q.correctIndex ?? 0)
        : ((q.correctIndex ?? 0) + 1) % q.options.length,
      confidence: "sure" as const,
      timeTakenSec: q.skillId.startsWith("apt-") ? 40 : 5,
    }));
    const result = await processSession(UID, {
      source: "assessment",
      sourceId: "e2e-assessment",
      trigger: "assessment",
      mcq: answers,
      comm: [
        {
          promptId: "beh-team-conflict",
          transcript:
            "During my second year project, my teammate and I disagreed on the database. I was responsible for the backend, so I set up a quick benchmark because data beats opinions. I built both versions and we compared them. As a result we picked Postgres and the API got 30% faster.",
          durationSec: 55,
        },
      ],
    });

    expect(result.total).toBe(20);
    expect(result.correct).toBe(10);
    // Fast wrong answers are careless by rule; all flagged overconfident (confidence "sure").
    const wrong = result.graded.filter((g) => !g.isCorrect);
    expect(wrong.every((g) => g.mistake?.primaryType === "careless")).toBe(true);
    expect(wrong.every((g) => g.mistake?.overconfident)).toBe(true);
    expect(result.comm).toHaveLength(1);
    expect(result.comm[0]?.overall).toBeGreaterThan(0);

    const attempts = await data.getAttempts(UID);
    const mistakes = await data.getMistakes(UID);
    const states = await data.getSkillStates(UID);
    expect(attempts).toHaveLength(20);
    expect(mistakes).toHaveLength(10);
    expect(attempts.filter((a) => a.mistakeId)).toHaveLength(10);
    expect(states["apt-arithmetic"]?.mastery).toBeGreaterThan(0.5);
    expect(states["dsa-complexity"]?.mistakeCounts.careless).toBe(2);
    expect(states["dsa-complexity"]?.levelStats.concept.attempts).toBe(2);

    const snaps = await data.getReadinessSnapshots(UID);
    expect(snaps).toHaveLength(1);
    expect(Object.keys(snaps[0]?.perCompany ?? {})).toEqual(
      expect.arrayContaining(["amazon-sde", "tcs-nqt"]),
    );
    expect((await data.getCategoryScoreHistory(UID))[0]?.scores.aptitude).toBeGreaterThan(50);
    const tcsAfter = result.after.find((s) => s.companyId === "tcs-nqt")?.score ?? 0;
    expect(tcsAfter).toBeGreaterThan(0);
  });

  it("skill gap sees weak skills and mistake types", async () => {
    const gap = await loadSkillGap(UID);
    expect(gap.hasData).toBe(true);
    expect(gap.weakest[0]?.category).toBe("dsa");
    expect(gap.mistakeTotals.careless).toBe(10);
    expect(gap.mistakeTotals.overconfident).toBe(10);
  });

  it("roadmap targets the weak coding skills with timed drills (careless)", async () => {
    const { roadmapId } = await generateRoadmap(UID, "assessment");
    const user = await data.getUserDoc(UID);
    expect(user?.activeRoadmapId).toBe(roadmapId);
    const active = await data.getActiveRoadmap(UID, roadmapId);
    expect(active?.tasks.length).toBeGreaterThan(0);
    const states = await data.getSkillStates(UID);
    const slipped = (id: string | undefined) => (states[id ?? ""]?.mistakeCounts.careless ?? 0) > 0;
    const dsaTasks = active?.tasks.filter((t) => t.skillId?.startsWith("dsa-")) ?? [];
    expect(dsaTasks.length).toBeGreaterThan(0);
    // Skills with careless slips get timed drills; never-attempted skills start with "learn".
    expect(dsaTasks.filter((t) => slipped(t.skillId)).every((t) => t.kind === "timed_drill")).toBe(
      true,
    );
    expect(dsaTasks.filter((t) => !slipped(t.skillId)).every((t) => t.kind === "learn")).toBe(true);
    // Daily minutes never exceed hoursPerDay × 60.
    const perDay = new Map<string, number>();
    for (const t of active?.tasks ?? []) {
      const key = t.dueDate.toISOString().slice(0, 10);
      perDay.set(key, (perDay.get(key) ?? 0) + t.estMinutes);
    }
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(120);
  });

  it("daily practice includes 4 coding-pattern questions for the user's domain", async () => {
    const { pickPracticeSections } = await import("@/lib/server/questions");
    const sections = await pickPracticeSections(UID);
    expect(sections.domain).toBe("sde"); // "Software Development Engineer" + Amazon/TCS
    expect(sections.patterns).toHaveLength(4);
    expect(sections.patterns.every((q) => q.pattern && q.domains?.includes("sde"))).toBe(true);
    expect(sections.weak.every((q) => !q.pattern)).toBe(true);
    expect(sections.patterns.length + sections.weak.length).toBe(10);
  });

  it("daily coding: 3 domain problems, stable for the day; a solve raises mastery", async () => {
    const { getDailyCoding, submitCoding } = await import("@/lib/server/coding");
    const day = new Date("2026-09-26T09:00:00Z");
    const daily = await getDailyCoding(UID, day);
    expect(daily.domain).toBe("sde");
    expect(daily.today).toHaveLength(3);
    expect(daily.today.every((p) => p.domains.includes("sde"))).toBe(true);
    expect(daily.today.filter((p) => p.difficulty === "Easy")).toHaveLength(1);
    const again = await getDailyCoding(UID, new Date("2026-09-26T20:00:00Z"));
    expect(again.today.map((p) => p.id)).toEqual(daily.today.map((p) => p.id));

    const problem = daily.today[0];
    if (!problem) throw new Error("no problem");
    const res = await submitCoding(UID, {
      problemId: problem.id,
      language: "python",
      code: "def solution():\n    pass\n",
      tests: { passed: problem.tests.length, total: problem.tests.length },
    });
    expect(res.solved).toBe(true);
    expect(res.firstSolve).toBe(true);
    expect(res.mastery.after).toBeGreaterThan(res.mastery.before);
    const after = await getDailyCoding(UID, day);
    expect(after.solved).toContain(problem.id);
  });

  it("daily practice targets weak skills and moves readiness up", async () => {
    const set = await pickPracticeSet(UID);
    expect(set.filter((q) => q.skillId.startsWith("dsa-")).length).toBeGreaterThanOrEqual(5);
    const result = await processSession(UID, {
      source: "practice",
      sourceId: "e2e-practice",
      trigger: "practice",
      mcq: set.map((q) => ({
        questionId: q.id,
        selectedIndex: q.correctIndex,
        confidence: "likely" as const,
        timeTakenSec: 50,
      })),
    });
    expect(result.correct).toBe(10);
    // Pattern questions reveal their approach only after grading.
    const patternResults = result.graded.filter((g) => g.pattern);
    expect(patternResults.length).toBe(4);
    expect(patternResults.every((g) => (g.approach ?? "").length > 20)).toBe(true);
    const before = result.before.find((s) => s.companyId === "amazon-sde")?.score ?? 0;
    const after = result.after.find((s) => s.companyId === "amazon-sde")?.score ?? 0;
    expect(after).toBeGreaterThan(before);
    // assessment + first coding solve + this practice session
    expect(await data.getReadinessSnapshots(UID)).toHaveLength(3);
  });
});
