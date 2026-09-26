// Seeds the judges' demo account ("Try demo account" on the login page) with two weeks of
// history, so every page shows data. Idempotent: wipes and rebuilds the demo user.
//   npm run seed:demo
// Runs the real pipeline (grading, mistake rules, mastery, readiness), so the numbers are
// what the app would compute. AI-only content (skill-gap suggestions, interview evaluation,
// code review) is hand-written demo content, marked as such in comments.
import { DEMO_UID } from "@/lib/auth/constants";
import {
  getQuestions,
  saveAssessment,
  saveInterviewSession,
  saveMockInterview,
  saveProject,
  saveSkillGapReport,
  updateTask,
  getActiveRoadmap,
  getUserDoc,
} from "@/lib/data";
import { getAdminDb } from "@/lib/firebase/admin";
import { processSession, type CommAnswer, type McqAnswer } from "@/lib/server/pipeline";
import { pickPracticeSet } from "@/lib/server/questions";
import { recordSnapshots } from "@/lib/server/readiness";
import { generateRoadmap } from "@/lib/server/roadmap";
import type { Question, WithId } from "@/lib/schemas";

const DAY = 864e5;
const db = getAdminDb();
const userRef = db.collection("users").doc(DEMO_UID);

function daysAgo(n: number): Date {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(18, 0, 0, 0);
  return d;
}

/** Moves the newest snapshot/category-score/attempt timestamps back to `at`. */
async function backdate(at: Date, since: Date): Promise<void> {
  for (const name of [
    "readinessSnapshots",
    "categoryScores",
    "attempts",
    "commAttempts",
    "mistakes",
  ]) {
    const field = name === "mistakes" ? null : "createdAt";
    const snap = field ? await userRef.collection(name).where(field, ">=", since).get() : null;
    if (!snap) continue;
    await Promise.all(snap.docs.map((d) => d.ref.update({ createdAt: at })));
  }
}

/** Answers correctly with probability `accuracy`; wrong answers prefer a tagged distractor. */
function answer(qs: Array<WithId<Question>>, accuracy: number, seed: number): McqAnswer[] {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return qs.map((q) => {
    const correct = q.correctIndex ?? 0;
    if (rand() < accuracy) {
      return {
        questionId: q.id,
        selectedIndex: correct,
        confidence: rand() < 0.6 ? "sure" : "likely",
        timeTakenSec: Math.round(q.expectedTimeSec * (0.6 + rand() * 0.6)),
      };
    }
    const tagged = Object.keys(q.distractorTags).map(Number);
    const wrong = tagged[0] ?? (correct + 1) % q.options.length;
    const fast = rand() < 0.35;
    return {
      questionId: q.id,
      selectedIndex: wrong,
      confidence: rand() < 0.4 ? "sure" : rand() < 0.5 ? "likely" : "guess",
      timeTakenSec: Math.round(q.expectedTimeSec * (fast ? 0.25 : 0.9 + rand() * 0.6)),
    };
  });
}

const COMM: CommAnswer[] = [
  {
    promptId: "beh-team-conflict",
    transcript:
      "Um, so in my second year mini project, basically me and my teammate disagreed on using Firebase or MySQL. I was handling the backend. I think I just went with what I knew. We finished the project on time.",
    durationSec: 48,
  },
  {
    promptId: "tech-hash-map",
    transcript:
      "A hash map stores key value pairs. It uses a hash function to convert the key into an index in an array, because of that lookup is usually constant time. For example in Python a dictionary lets you find a student's marks by roll number directly without scanning the whole list.",
    durationSec: 62,
  },
];

const COMM_LATER: CommAnswer[] = [
  {
    promptId: "beh-team-conflict",
    transcript:
      "During my second year mini project, my teammate and I disagreed on Firebase versus MySQL. I was responsible for the backend, so the task was to pick a database we could ship in three weeks. I built a small prototype with both and compared setup time and query needs. As a result we chose Firebase, finished a week early, and I learned to settle arguments with data.",
    durationSec: 84,
  },
];

async function main() {
  console.log(`Resetting ${DEMO_UID}...`);
  await db.recursiveDelete(userRef);
  const now = new Date();
  await userRef.set({
    name: "Demo Student",
    email: "demo@proofprep.app",
    photoURL: null,
    createdAt: daysAgo(15),
    lastActiveAt: now,
    onboardingStep: "done",
    assessmentStatus: "done",
    profile: {
      targetRole: "Software Development Engineer",
      targetCompanies: ["amazon-sde", "tcs-nqt", "zoho"],
      placementDate: new Date(Date.now() + 75 * DAY),
      hoursPerDay: 2,
      links: {
        github: "https://github.com/demo-student",
        linkedin: "https://linkedin.com/in/demo-student",
        leetcode: "https://leetcode.com/u/demo-student",
      },
    },
    readiness: {},
  });

  // 1. Quick assessment, 14 days ago.
  const assessmentQs = await getQuestions("assessment");
  const t0 = new Date();
  const assessmentId = await saveAssessment(DEMO_UID, {
    kind: "quick",
    status: "completed",
    startedAt: daysAgo(14),
    completedAt: daysAgo(14),
    sections: {},
  });
  const a = await processSession(DEMO_UID, {
    source: "assessment",
    sourceId: assessmentId,
    trigger: "assessment",
    mcq: answer(assessmentQs, 0.55, 7),
    comm: COMM,
  });
  await backdate(daysAgo(14), t0);
  console.log(`  assessment: ${a.correct}/${a.total}`);

  // 2–3. Practice sessions, 10 and 6 days ago.
  for (const [ago, acc, seed] of [
    [10, 0.65, 11],
    [6, 0.75, 23],
  ] as const) {
    const t = new Date();
    const set = await pickPracticeSet(DEMO_UID);
    const r = await processSession(DEMO_UID, {
      source: "practice",
      sourceId: `demo-practice-${ago}`,
      trigger: "practice",
      mcq: answer(set, acc, seed),
      comm: ago === 6 ? COMM_LATER : [],
    });
    await backdate(daysAgo(ago), t);
    console.log(`  practice ${ago}d ago: ${r.correct}/${r.total}`);
  }

  // 4. An analyzed project + a completed defense interview, 3 days ago (demo content:
  //    in the app these come from P3, P6 and P7).
  const projectId = await saveProject(DEMO_UID, {
    source: "github",
    repoUrl: "https://github.com/demo-student/campus-canteen",
    name: "Campus Canteen",
    summary:
      "A food-ordering web app for the college canteen: React frontend, Flask REST API and PostgreSQL. Students order ahead and staff see a live queue.",
    stackDetected: ["React", "Flask", "PostgreSQL", "SQLAlchemy", "JWT"],
    claims: [
      {
        id: "c1",
        text: "Built a REST API in Flask with JWT authentication",
        verdict: "supported",
        evidence: "JWT issued in auth.py and checked by a decorator on every order route.",
        fileRefs: ["backend/auth.py:12-48", "backend/routes/orders.py:5-20"],
      },
      {
        id: "c2",
        text: "Real-time order tracking with WebSockets",
        verdict: "unsupported",
        evidence:
          "No WebSocket library in requirements.txt; the frontend polls /orders every 10 seconds.",
        fileRefs: ["frontend/src/hooks/useOrders.js:8-22", "backend/requirements.txt"],
      },
      {
        id: "c3",
        text: "Designed a normalised PostgreSQL schema",
        verdict: "supported",
        evidence: "models.py defines users, items, orders and order_items with foreign keys.",
        fileRefs: ["backend/models.py:1-64"],
      },
      {
        id: "c4",
        text: "Reduced page load time by 40%",
        verdict: "unverified",
        evidence: "A performance metric; the code cannot confirm it.",
        fileRefs: [],
      },
      {
        id: "c5",
        text: "Implemented role-based access for staff and students",
        verdict: "partial",
        evidence: "A role column exists, but only one route checks it.",
        fileRefs: ["backend/models.py:10-14", "backend/routes/admin.py:6"],
      },
    ],
    interviewHooks: [
      {
        topic: "Polling vs WebSockets",
        why: "The resume says real-time; the code polls.",
        fileRef: "frontend/src/hooks/useOrders.js",
      },
      {
        topic: "JWT expiry and refresh",
        why: "Tokens never expire in auth.py.",
        fileRef: "backend/auth.py",
      },
      {
        topic: "Order state transitions",
        why: "Status is a free-text column.",
        fileRef: "backend/models.py",
      },
    ],
    analyzedAt: daysAgo(3),
  });
  const turns = [
    [
      "Your resume says real-time order tracking with WebSockets. Walk me through where that lives in the code.",
      "probe_claim",
      "Actually we used polling every 10 seconds. I planned WebSockets but didn't finish it.",
      3,
      2,
      4,
    ],
    [
      "What would it take to move from polling to WebSockets here?",
      "tradeoff",
      "I'd add Flask-SocketIO and emit an event when order status changes, and the client subscribes instead of polling.",
      4,
      3,
      4,
    ],
    [
      "How do your JWTs expire, and what happens when one is stolen?",
      "depth",
      "Hmm, I don't think I set an expiry. I would add exp and a refresh token.",
      2,
      2,
      3,
    ],
    [
      "Why did you normalise orders into order_items?",
      "concept",
      "Because one order has many items, so a separate table avoids repeating order data and keeps quantities per item.",
      5,
      4,
      5,
    ],
    [
      "Only one route checks the staff role. How would you enforce it everywhere?",
      "depth",
      "A decorator like @require_role('staff') on each admin route, reading the role from the JWT claims.",
      4,
      3,
      4,
    ],
  ] as const;
  const overall = {
    score: 3.4,
    strengths: ["Honest about what wasn't built", "Clear reasoning on schema design"],
    gaps: [
      "No token expiry: learn JWT exp/refresh",
      "Resume overstates real-time; reword or implement it",
    ],
  };
  const sessionId = await saveInterviewSession(DEMO_UID, {
    mode: "project_defense",
    projectId,
    turns: turns.map(([question, intent, ans, c, d, cl]) => ({
      question,
      intent,
      answer: ans,
      eval: {
        scores: { correctness: c, depth: d, clarity: cl },
        strengths: [],
        gaps: [],
        idealOutline: [],
        skillEvidence: [],
        claimVerdictUpdate: { claimId: null, verdict: null },
      },
    })),
    overall,
    status: "completed",
    createdAt: daysAgo(3),
  });
  await userRef.collection("projects").doc(projectId).update({ defenseScore: overall.score });
  let t = new Date();
  await recordSnapshots(DEMO_UID, "interview");
  await backdate(daysAgo(3), t);

  // Mock interview report (demo content for the AI code review).
  await saveMockInterview(DEMO_UID, {
    createdAt: daysAgo(3),
    mcq: { correct: 7, total: 10 },
    coding: {
      problemId: "two-sum",
      language: "Python",
      code: "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n",
      review: {
        likelyCorrect: true,
        issues: [],
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
        edgeCasesMissed: [],
        score: 9,
        hint: "Mention why you check before inserting (handles [3, 3]).",
      },
    },
    defense: {
      projectId,
      sessionId,
      score: overall.score,
      strengths: overall.strengths,
      gaps: overall.gaps,
    },
    overall: {
      score: 74.4,
      strengths: ["Round 1: 7/10 correct", "Coding: 9/10 (O(n))", ...overall.strengths],
      gaps: overall.gaps,
    },
  });

  // 5. Latest practice, yesterday.
  t = new Date();
  const last = await pickPracticeSet(DEMO_UID);
  const r = await processSession(DEMO_UID, {
    source: "practice",
    sourceId: "demo-practice-1",
    trigger: "practice",
    mcq: answer(last, 0.8, 42),
  });
  await backdate(daysAgo(1), t);
  console.log(`  practice 1d ago: ${r.correct}/${r.total}`);

  // Roadmap (code budget; P5 if a key is configured) with a few tasks done.
  await generateRoadmap(DEMO_UID, "assessment");
  const user = await getUserDoc(DEMO_UID);
  const active = await getActiveRoadmap(DEMO_UID, user?.activeRoadmapId);
  for (const task of active?.tasks.slice(0, 2) ?? [])
    await updateTask(DEMO_UID, task.id, { status: "done" });

  // Skill-gap suggestions (demo content; in the app this is P-GAP).
  await saveSkillGapReport(DEMO_UID, {
    createdAt: daysAgo(1),
    mustLearn: [
      {
        skill: "Trees & graphs",
        why: "Coding is your biggest lever for Amazon (45% weight, bar 80) and you haven't practised trees or graphs yet.",
      },
      {
        skill: "Two pointers & sliding window",
        why: "Most of your coding misses here were fast, careless slips, not gaps. Timed drills fix this quickly.",
      },
      {
        skill: "OS & DBMS fundamentals",
        why: "CS fundamentals carry 20% at Amazon and TCS; you have very few attempts, so confidence is low.",
      },
    ],
    shouldHave: [
      {
        item: "Make Campus Canteen truly real-time",
        why: "Your resume claims WebSockets but the code polls. Fix the code or the resume before interviews.",
      },
      {
        item: "A STAR story with a measurable result",
        why: "Your behavioural answers improved from no structure to full STAR; add a number to the Result every time.",
      },
    ],
    companyExpectations: [
      {
        companyId: "amazon-sde",
        expects: [
          "2 DSA rounds: medium trees/graphs/DP",
          "Leadership-principle stories in STAR",
          "Clear complexity analysis",
        ],
        yourGap: "DSA mastery is well below the 80 bar.",
      },
      {
        companyId: "tcs-nqt",
        expects: [
          "NQT aptitude: arithmetic, logical, verbal",
          "Basic coding",
          "OOP and DBMS basics in the technical interview",
        ],
        yourGap: "You're close; keep aptitude sharp and revise OOP.",
      },
      {
        companyId: "zoho",
        expects: [
          "C output and logic puzzles",
          "Array/string programming rounds",
          "Deep project discussion",
        ],
        yourGap: "Recursion and array problems need more practice.",
      },
    ],
  });

  const snaps = await userRef.collection("readinessSnapshots").get();
  console.log(
    `Done: ${snaps.size} readiness snapshots, project ${projectId}, interview ${sessionId}.`,
  );
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
