# ProofPrep

**AI placement prep built on one loop: diagnose → target → practise → re-measure.**
Built for PromptWars × GenAI Innovation Challenge ("Reimagine Placement Preparation").
The full product plan is in [PLAN.md](PLAN.md).

## The problem

Students at Indian engineering colleges prepare for campus placements (aptitude, DSA, CS
fundamentals, HR and technical interviews) with generic question banks. They don't know
**where they stand for a specific company**, **why** they get questions wrong, or whether
their resume survives a technical interview. They practise more of the same and hope.

## What ProofPrep does

| Feature                        | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Quick Assessment**           | 10 aptitude, 10 coding and 10 communication questions. Every MCQ asks "how sure are you?" and records time. Communication answers can be typed or spoken (Web Speech API).                                                                                                                                                                                                                                                                                         |
| **Skill Gap**                  | Overall, Coding, Aptitude and Communication rings. Your scores vs each target company's bar, weakest skills, a mistake-type breakdown, and AI suggestions for your role and companies.                                                                                                                                                                                                                                                                             |
| **Roadmap**                    | Code computes a daily time budget from days left, hours per day, company weights and your gaps. The AI (P5) sequences it; task type follows your mistake type. Tick tasks off, regenerate any time.                                                                                                                                                                                                                                                                |
| **Daily Practice**             | **Daily coding:** 3 problems a day for your domain and weakest skills, from 35 classics (LeetCode, Codeforces, HackerRank) restated in our own words with a link to the original. Write Python or JavaScript, **run the tests in your browser** (Pyodide/Web Worker, hidden tests on Submit), then get an AI review of complexity and edge cases. C++/Java get the AI review only. Plus a **concept drill**: 4 domain coding-pattern MCQs + 6 weak-spot questions. |
| **Mock Interview**             | Round 1: 10 timed MCQs (auto-submit at 10:00). Round 2: a coding problem with a 20-minute editor and an **AI code review** (not execution). Round 3: Project Defense. Final report.                                                                                                                                                                                                                                                                                |
| **Projects**                   | Add a public GitHub repo and/or your resume. The AI checks every resume claim against the code: supported / partial / unsupported / unverified, with file links.                                                                                                                                                                                                                                                                                                   |
| **Placement Readiness**        | Per company, with the formula and arithmetic on screen.                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Progress**                   | Readiness per company and category scores over time (Recharts).                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Personal Details / Connect** | Edit your target; save GitHub, LinkedIn and LeetCode links and upload your resume.                                                                                                                                                                                                                                                                                                                                                                                 |

## Differentiators

1. **Mistake Diagnosis.** Every wrong answer is classified as a _concept gap_, _application gap_ or _careless slip_, plus an _overconfident_ flag when you marked it "Sure". Deterministic rules decide first (answer time, the misconception tagged on the option you chose, your mastery and concept-level accuracy). The AI (P4) only handles cases no rule covers, so every classification can be traced. The roadmap then prescribes by type: concept → learn, application → mixed drill, careless → timed drill, overconfident → calibration drill.
2. **Project Defense.** Your resume says "real-time with WebSockets"; your code polls every 10 seconds. ProofPrep reads the repo (README, tree, up to 8 key files), marks that claim **unsupported** with the file that shows it, and the interviewer asks about it first.
3. **Communication Coach.** Answers are scored on structure (STAR for behavioural, claim-reason-example for technical and opinion), relevance, clarity and length. Pace and filler words are computed in code. The AI rewrites _your own_ answer in the right structure, with `[placeholders]` where facts are missing. It never judges accent.

## Readiness formula (transparent, verifiable)

For company _c_ and components _k_ ∈ {aptitude, coding/DSA, CS, projects, communication}:

```
Readiness_c = Σ_k  w_ck · min(1, S_k / B_ck) · 100
```

- `w_ck`: company weights (sum to 1). `B_ck`: company bar. Reaching the bar earns full credit; there's no extra credit above it.
- Aptitude, DSA and CS: mean mastery × 100 of the skills you've attempted, weighted by the company's skill importance.
- Projects: per project `50·(supported + 0.5·partial)/claims + 10·defenseScore`, then the mean of your top 2 projects.
- Communication: mean `overall` of your last 3 answers, where `overall = mean(structure, relevance, clarity, length) × 20`.
- Confidence (low / medium / high) per component, from how much data backs it. Overall confidence is the lowest among components weighted ≥ 0.15.
- Mastery update: `mastery ← mastery + (0.15 + 0.05·difficulty)·(outcome − mastery)`, where outcome is 1 if correct, 0.6 for a careless slip, 0 otherwise.

| Company    | w apt | w dsa | w cs | w proj | w comm | Bars (apt/dsa/cs/proj/comm) |
| ---------- | ----- | ----- | ---- | ------ | ------ | --------------------------- |
| TCS NQT    | .35   | .20   | .20  | .10    | .15    | 70/50/55/40/60              |
| Infosys    | .30   | .25   | .20  | .10    | .15    | 70/55/55/40/60              |
| Zoho       | .20   | .40   | .15  | .15    | .10    | 65/75/60/55/55              |
| Amazon SDE | .10   | .45   | .20  | .15    | .10    | 60/80/70/60/65              |
| Microsoft  | .05   | .45   | .20  | .15    | .15    | 60/85/70/65/70              |

Worked example (unit-tested in `lib/engine/readiness.test.ts`): scores 63/48/60/30/54 give TCS **91.7** and Amazon **69.95**, and DSA is Amazon's biggest lever (18 of the 30 missing points).

## Prompts

All in `lib/llm/prompts/`. Providers are Gemini (default: `gemini-2.5-flash`, with `gemini-flash-lite-latest` for fast calls and automatic retry/fallback on overload) and Claude, chosen by `LLM_PROVIDER`. Every call goes through `lib/llm/call.ts`, which forces structured output (tool use on Claude, JSON schema on Gemini), validates with Zod and retries once. The server-side loop has code fallbacks, so it keeps working if the AI is unavailable.

| ID                         | Purpose                                                   | Model  | Fallback without AI       |
| -------------------------- | --------------------------------------------------------- | ------ | ------------------------- |
| P1 `p1-resume-parser`      | Resume PDF → projects + checkable claims                  | Sonnet | error shown               |
| P2 `p2-claim-extractor`    | README → claims (GitHub-only projects)                    | Haiku  | error shown               |
| P3 `p3-repo-analyzer`      | Claims vs code → verdicts, evidence, interview hooks      | Sonnet | resume-only, "unverified" |
| P4 `p4-mistake-classifier` | Ambiguous wrong answers → type + explanation              | Haiku  | rules + "concept" default |
| P5 `p5-roadmap-generator`  | Sequences the code-computed budget into 2 weeks           | Sonnet | deterministic rotation    |
| P6 `p6-interviewer`        | Next project-defense question (unsupported claims first)  | Sonnet | error shown               |
| P7 `p7-answer-evaluator`   | Scores the 5 answers, overall defense score               | Sonnet | error shown               |
| P8 `p8-comm-scorer`        | Structure/relevance/clarity/length + restructured answer  | Sonnet | keyword heuristic         |
| P-GAP `p-gap`              | Must-learn, should-have, per-company expectations         | Sonnet | error shown               |
| P-CODE `p-code`            | AI code review: correctness, complexity, edge cases, hint | Sonnet | error shown               |

Clients reach an LLM only through API routes. `/api/llm/[promptId]` exposes P8 and P-CODE; the others are called inside feature routes.

## Run it

Requires Node 22.18+ and a Firebase project (Auth with Google enabled, Firestore; Storage is optional).

```bash
npm install
cp .env.example .env.local   # fill in Firebase client + Admin values, ANTHROPIC_API_KEY, GITHUB_TOKEN
npm run seed                 # skills, companies, prompts, 60 questions, 2 coding problems
npm run seed:demo            # the judges' demo account with 2 weeks of history
npm run dev                  # http://localhost:3000 → "Try demo account"
```

Publish `firestore.rules` in the Firebase console (Firestore → Rules).

| Command                                | What it does                                                   |
| -------------------------------------- | -------------------------------------------------------------- |
| `npm test`                             | Unit tests: readiness formula, mastery, mistake rules, routing |
| `npm run test:e2e`                     | The full loop against real Firestore with a throwaway user     |
| `npm run typecheck` / `lint` / `build` | Quality gates                                                  |

## Architecture

- **Next.js 16 (App Router)**, TypeScript strict, Tailwind and shadcn/ui.
- **Firebase Auth** (Google) → httpOnly session cookie → `proxy.ts` routes new users to onboarding, resumes partial ones at their saved step, and sends finished ones home.
- **Firestore via the Admin SDK only.** `lib/data/*` is a typed repository and every read is Zod-validated. The browser never writes, so students can't edit their own scores; `firestore.rules` allows only own-data reads.
- **Answer keys never leave the server.** Clients get `PublicQuestion`; grading happens in `/api/grade` and the pipeline.
- **One pipeline for every answered set** (`lib/server/pipeline.ts`): grade → attempts → rules (+P4) → mistakes → mastery → communication scoring (P8) → readiness and category snapshots.

```
app/(auth)        login            app/(app)/*     sidebar pages      app/api/*   routes
lib/engine        pure logic       lib/server      services           lib/data    repository
lib/llm           LLM layer        lib/schemas     Zod + types        data/seed   seed content
```
