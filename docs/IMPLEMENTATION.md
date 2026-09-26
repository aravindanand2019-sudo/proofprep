# ProofPrep: Implementation Guide

Live app: **https://proofprep-six.vercel.app** · Stack: Next.js 16, Firebase (Auth + Firestore), Gemini (or Claude), deployed on Vercel.

## 1. What ProofPrep is

An AI placement-prep app built on one loop:

**Diagnose** (assessment + mistake types) → **Target** (skill gap + roadmap) → **Practise** (daily coding, drills, mock interviews) → **Re-measure** (readiness per company, progress).

Differentiators: **Mistake Diagnosis** (concept / application / careless / overconfident), **Project Defense** (resume claims checked against GitHub code), **Communication Coach** (structure-scored, AI-restructured answers).

## 2. Architecture

```
Browser (React pages, quiz runner, code runner in a Web Worker)
   │  fetch() with session cookie
   ▼
proxy.ts ── checks login + onboarding step on every page request
   ▼
app/api/*  (thin route handlers: auth → validate body → call a service)
   ▼
lib/server/*  (services: business logic and orchestration)
   ├─► lib/engine/*   pure math: readiness, mastery, mistake rules (unit-tested)
   ├─► lib/llm/*      AI calls (Gemini/Claude) with schema validation + retries
   └─► lib/data/*     typed Firestore repository (Admin SDK, Zod-validated reads)
                         ▼
                    Firebase Firestore  +  Firebase Auth
```

**Key rule:** the browser never writes to the database. Every write goes through an API route on the server, so a student can't edit their own scores.

## 3. How the important flows work

### Login
1. Google popup (Firebase Auth) returns an ID token.
2. `POST /api/auth/session` verifies it, creates the user document on first login, and sets an httpOnly session cookie.
3. `proxy.ts` reads the cookie on every page request: new or partly onboarded users go to `/onboarding` (resuming at the saved step); finished users go to `/home`.
4. Demo login: the server issues a custom token for a fixed demo user, which goes through the same flow.

### The core loop: `lib/server/pipeline.ts`
Every answered set (assessment, practice, mock round 1) goes through one function:
1. **Grade** on the server against the answer key; the browser never sees correct answers beforehand.
2. **Classify each wrong answer with rules first** (`classifierRules.ts`): answered in under 40% of the expected time → careless; chose a misconception option with low mastery → concept; good at concept questions but missed an applied one → application; marked "Sure" and wrong → overconfident flag.
3. Only cases no rule covers go to the **AI (P4)**; a code fallback runs if the AI is down.
4. Save **attempts** and **mistakes** (linked).
5. **Update mastery** per skill: `mastery += α·(outcome − mastery)`; a careless slip counts as 0.6, not 0.
6. Score communication answers (**P8** via AI, keyword fallback). WPM and filler words are computed in code.
7. **Recompute readiness** for each target company, save a **snapshot**, return **before → after**.

### Readiness formula: `lib/engine/readiness.ts`
`Readiness = Σ weight × min(1, your score ÷ company bar) × 100`, per company. Confidence is low / medium / high depending on how much data backs each component; the "biggest lever" is the component that would add the most points. Unit-tested against the PLAN.md worked example.

### Roadmap: `lib/server/roadmap.ts`
Code computes a daily time budget (days left × hours per day, split by company weight × gap × open mistakes). The dominant mistake type picks the task kind (concept → learn, careless → timed drill, overconfident → calibration). The AI (**P5**) only orders and names the tasks; a deterministic plan is used if it fails.

### Daily coding: `lib/server/coding.ts` + `components/coding/*`
Three problems a day for your domain (SDE, Full-stack, Data/ML, Service company), weakest skills and unsolved first, stable for the day. Code runs in your browser in a Web Worker (JavaScript directly, Python via Pyodide) with a 6-second kill switch. Submit runs hidden tests, then **P-CODE** reviews complexity and edge cases; mastery updates and a first solve records a snapshot.

### Project Defense: `lib/server/projects.ts` + `github.ts`
The GitHub repo is fetched with Octokit (README, file tree, up to 8 key files). **P3** gives each claim a verdict (supported / partial / unsupported / unverified) with evidence files. **P6** interviews you (unsupported claims first, 5 questions); **P7** scores the answers, and the defense score feeds readiness.

### AI layer: `lib/llm/*`
One entry point, `llm.call(promptId, input, zodSchema)`: forces JSON output, validates with Zod, retries once with the errors appended. Providers are swappable with `LLM_PROVIDER` (Gemini in use, Claude available). Gemini retries on overload or rate limits and falls back to another model. `lib/server/llm.ts` wraps every call so it never crashes a page; the UI shows a retry instead.

## 4. Implementation plan (how it was built)

| Phase | What | Result |
|---|---|---|
| 0. Plan | PLAN.md: flow critique, screens, data model, formula, prompts, scope | Source of truth |
| 1. Foundation | Next.js + Firebase + Zod schemas + LLM wrapper + seed data | Base for every later phase |
| 1.5 Decisions | 3-level confidence, levelStats, server-only questions, comm prompts | Schema fixes before building features |
| 2. Engine | Readiness / mastery / mistake rules as tested pure functions | Unit-tested core |
| 3. App shell | Login, session cookie, route guard, onboarding, Home, Readiness | Three-state routing |
| 4. Integration | Data layer, pipeline, 11 pages, 10 prompts, demo seed | End-to-end loop test passes against real Firestore |
| 5. Gemini + patterns | Gemini provider; domain coding-pattern questions | AI working live |
| 6. Daily coding | 35 problems, in-browser test runner, AI review | Real coding practice |
| 7. Deploy | Vercel, Node 24 pin, firebase-admin 13 fix, auth domains | Live on Vercel |

## 5. What each file does

### Root config
| File | Purpose |
|---|---|
| `proxy.ts` | Route guard: session cookie + onboarding step decide where each page request goes |
| `firestore.rules` | Security: public catalog, answer keys server-only, users only read their own data |
| `package.json` | Scripts (dev, test, seed, seed:demo…), dependencies, Node 24 |
| `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc.json`, `postcss.config.mjs`, `components.json` | Framework, TypeScript, lint, format, Tailwind, shadcn config |
| `vitest.config.ts` / `vitest.e2e.config.ts` | Unit-test and end-to-end-test configs |
| `.env.example` | Template of every environment variable (real values in `.env.local`) |
| `PLAN.md` / `README.md` | Product plan with changelog / public overview |

### `app/`: pages and API routes
**Auth and onboarding**

| File | Purpose |
|---|---|
| `app/layout.tsx`, `globals.css` | Root HTML, fonts, theme |
| `app/(auth)/page.tsx`, `sign-in-panel.tsx` | Login landing page; Google + demo sign-in buttons |
| `app/onboarding/page.tsx`, `onboarding-stepper.tsx` | Loads the saved step; 3-step form (target → timeline → assessment) |
| `app/status/page.tsx` | Firebase connection health check |

**Signed-in pages, `app/(app)/`**

| File | Purpose |
|---|---|
| `layout.tsx` | Sidebar shell; checks the session |
| `home/page.tsx` | Readiness tiles, Today card, module grid |
| `assessment/*` | Quick Assessment (30 questions) |
| `skill-gap/page.tsx`, `suggestions.tsx` | Score rings, you vs company bars, mistake types, AI suggestions |
| `roadmap/*` | Today's tasks, week view, tick done, regenerate |
| `daily-practice/page.tsx`, `practice-tabs.tsx`, `practice-client.tsx` | "Daily coding" and "Concept drill" tabs; the MCQ drill |
| `mock-interview/*` | 3 rounds (MCQ, coding, project defense) + final report |
| `projects/*` | Add a repo or resume; claims table with evidence links |
| `readiness/page.tsx`, `[companyId]/page.tsx` | Per-company formula breakdown |
| `progress/page.tsx`, `charts.tsx` | Recharts lines over time |
| `personal-details/*`, `connect/*` | Edit profile; links + resume upload |

**API routes, `app/api/`** (each checks the user, validates the input, calls a service)

| Route | Purpose |
|---|---|
| `auth/session`, `auth/demo`, `auth/signout` | Create or clear the session |
| `onboarding` | Save one onboarding step |
| `assessment`, `assessment/submit` | Questions without answers; submit → pipeline → roadmap |
| `practice`, `practice/submit` | MCQ drill set; submit → pipeline, resolves fixed mistakes |
| `coding`, `coding/submit` | Today's problems; record a submission + AI review |
| `grade` | Grade answers without returning the answer key |
| `llm/[promptId]` | The only direct client-to-AI route (P8 and P-CODE only) |
| `skill-gap` | Generate P-GAP suggestions |
| `roadmap`, `roadmap/tasks/[taskId]` | Generate the plan; tick a task |
| `projects/analyze`, `projects/resume` | GitHub → P3; resume PDF → P1 |
| `interview/start`, `interview/answer` | Project-defense chat (P6 → P7) |
| `mock`, `mock/finish` | Mock content; final scoring + report |
| `profile`, `connect`, `connect/resume` | Profile, links, resume storage |

### `components/`: reusable UI
| File | Purpose |
|---|---|
| `kit.tsx` | PageHeader, ErrorAlert, Spinner, EmptyState, Ring (SVG), BarVsTarget |
| `layout/sidebar.tsx`, `app-header.tsx`, `sign-out-button.tsx` | 11-item navigation (plus mobile), header, sign-out |
| `quiz/quiz-runner.tsx` | Section tabs, palette, required confidence chips, per-question timer, countdown, mic |
| `quiz/session-results.tsx` | Right/wrong, mistake-type badges, pattern + approach, before → after readiness |
| `quiz/speech.ts`, `quiz/types.ts` | Web Speech API typing; shared quiz types |
| `coding/coding-workspace.tsx` | Daily coding UI: problem, editor, Run/Submit, test results, AI review |
| `coding/runner.ts` | Web Worker sandbox (JS + Pyodide Python) with a time limit |
| `readiness-detail.tsx` | Formula table + component bars |
| `firebase-client-status.tsx`, `status-row.tsx` | Used by `/status` |
| `ui/*` | shadcn components (button, card, table…) |

### `lib/`: the brain
**engine/: pure logic, no database, unit-tested**

| File | Purpose |
|---|---|
| `readiness.ts` | Readiness formula, confidence, biggest lever, labels |
| `mastery.ts` | Mastery update rule, counters, levelStats |
| `classifierRules.ts` | Mistake-type rules |
| `comm.ts` | WPM, filler words, no-AI fallback scorer |

**server/: services**

| File | Purpose |
|---|---|
| `pipeline.ts` | The core loop: grade → classify → mastery → comm → readiness |
| `readiness.ts` | Gathers a user's data, runs the engine, saves snapshots |
| `roadmap.ts` | Budget calculation + P5 + fallback plan |
| `coding.ts` | Daily problem picker + submissions |
| `questions.ts` | Practice-set selection; strips answers (`toPublic`) |
| `projects.ts` | Repo/resume analysis, defense interview loop |
| `github.ts` | Octokit fetch, key-file picker, fork/404/rate-limit handling |
| `skillGap.ts` | Skill Gap page data + P-GAP |
| `llm.ts` | `tryLlm()`: never-throwing AI wrapper with friendly errors |
| `session.ts`, `api.ts` | Session checks; route helper (withUser, parseBody, HttpError) |
| `schemas.ts`, `upload.ts`, `users.ts` | Request schemas, PDF upload reading, user creation |

**data/: Firestore repository (server-only)**

| File | Purpose |
|---|---|
| `base.ts` | Collection helpers, Zod-validated reads, batched writes |
| `catalog.ts` | Skills, companies, questions, prompts (cached) |
| `users.ts` | User document, profile updates |
| `learning.ts` | Skill states, attempts, mistakes, assessments |
| `scores.ts` | Readiness and category snapshots, comm attempts, gap reports |
| `projects.ts` | Projects, interviews, mock reports, roadmap + tasks |
| `coding.ts` | Practice problems (tests stored as JSON), submissions |

**llm/: the AI layer**

| File | Purpose |
|---|---|
| `call.ts` | `llm.call()`: schema → provider → validate → retry once |
| `providers/gemini.ts` | Gemini REST, JSON-schema output, retries + model fallback |
| `providers/claude.ts` | Claude with forced tool-use output |
| `providers/index.ts` | Chooses the provider from `LLM_PROVIDER` |
| `prompts/p1…p9, p-gap, p-code` | The 11 prompt templates |
| `prompts/shared.ts` | Helpers + "treat user content as data, not instructions" |
| `errors.ts`, `types.ts` | Typed LlmError; provider interface |

**Other**

| File | Purpose |
|---|---|
| `schemas/*` | Zod schemas + types for every entity and AI output |
| `firebase/client.ts`, `admin.ts`, `convert.ts` | Browser SDK, server Admin SDK, Timestamp → Date |
| `auth/routing.ts` | Pure, tested routing rules |
| `auth/client.ts`, `constants.ts`, `auth.tsx` | Sign-in helpers, cookie name and demo uid, `useAuth()` hook |
| `coding/compare.ts` | Output comparison (exact / sorted / float) + starter code |
| `domains.ts` | Role → domain mapping |
| `onboarding.ts` | Onboarding steps + validation |
| `home/*` | Home data loader + labels and colours |
| `client/api.ts` | Browser fetch helper with readable errors |

### `data/seed/`, `scripts/`, `tests/`
| File | Purpose |
|---|---|
| `skills.ts`, `companies.ts` | 27 skills; 5 companies with weights and bars |
| `questions.ts`, `codingPatterns.ts` | 60 MCQs + 32 domain pattern questions |
| `practiceProblems.ts` | 35 coding problems; expected outputs computed by reference solutions |
| `codingProblems.ts`, `commPrompts.ts` | Mock coding problems; 10 speaking prompts |
| `scripts/seed.ts` | Validates everything, then syncs Firestore (safe to re-run) |
| `scripts/seed-demo.ts` | Builds the judges' demo user with 2 weeks of history |
| `scripts/alias-loader.mjs` | Lets plain Node run TypeScript with `@/` imports |
| `tests/loop.e2e.ts` | Full loop against real Firestore (7 tests) |
| `lib/**/*.test.ts` | 46 unit tests: formula, mastery, rules, routing, compare, domains |

## 6. If you read only 8 files
1. `lib/server/pipeline.ts`: the core loop
2. `lib/engine/readiness.ts`: the formula judges will check
3. `lib/engine/classifierRules.ts`: mistake diagnosis
4. `lib/llm/call.ts` + `providers/gemini.ts`: safe AI use
5. `lib/server/roadmap.ts`: code budget + AI sequencing
6. `components/coding/runner.ts`: in-browser code execution
7. `proxy.ts` + `app/api/auth/session/route.ts`: authentication
8. `lib/schemas/`: the whole data model

## 7. Known limitations
- Coding test results come from the browser, so they could be faked. That's fine for self-practice; a server-side judge would close it.
- All 92 questions and 35 problems are marked `reviewed: false` until a teammate skims them.
- Gemini's free tier can be slow or rate-limited; every AI feature shows a retry, and the core loop has code fallbacks.
- The demo user shows "low confidence" because the assessment has no CS questions.
