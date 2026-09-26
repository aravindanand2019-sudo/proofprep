// Communication Coach prompts (PLAN.md Section 3): 4 behavioral, 4 technical, 2 opinion.
import type { CommPrompt, WithId } from "../../lib/schemas/index.ts";

export const commPrompts: WithId<CommPrompt>[] = [
  // --- Behavioral (STAR) ---
  {
    id: "beh-team-conflict",
    kind: "behavioral",
    text: "Tell me about a time you disagreed with a teammate on a project. How did you resolve it?",
    targetDurationSec: 120,
    skillId: "comm-behavioral-star",
  },
  {
    id: "beh-missed-deadline",
    kind: "behavioral",
    text: "Describe a time you were about to miss a deadline. What did you do?",
    targetDurationSec: 120,
    skillId: "comm-behavioral-star",
  },
  {
    id: "beh-learned-fast",
    kind: "behavioral",
    text: "Tell me about a time you had to learn a new tool or technology quickly to finish a task.",
    targetDurationSec: 120,
    skillId: "comm-behavioral-star",
  },
  {
    id: "beh-initiative",
    kind: "behavioral",
    text: "Describe a situation where you took initiative without being asked. What was the result?",
    targetDurationSec: 120,
    skillId: "comm-behavioral-star",
  },

  // --- Technical (claim-reason-example) ---
  {
    id: "tech-process-vs-thread",
    kind: "technical",
    text: "Explain the difference between a process and a thread to a friend who is not from CS.",
    targetDurationSec: 90,
    skillId: "comm-technical-explanation",
  },
  {
    id: "tech-url-to-page",
    kind: "technical",
    text: "What happens between typing a URL into the browser and seeing the page?",
    targetDurationSec: 120,
    skillId: "comm-technical-explanation",
  },
  {
    id: "tech-hash-map",
    kind: "technical",
    text: "Explain how a hash map works and why lookups are usually O(1).",
    targetDurationSec: 90,
    skillId: "comm-technical-explanation",
  },
  {
    id: "tech-project-walkthrough",
    kind: "technical",
    text: "Walk me through one project you built: the problem, your design, and one trade-off you made.",
    targetDurationSec: 150,
    skillId: "comm-project-walkthrough",
  },

  // --- Opinion (claim-reason-example) ---
  {
    id: "op-specialise-or-generalise",
    kind: "opinion",
    text: "Should freshers specialise early or stay generalists? Pick a side and defend it.",
    targetDurationSec: 90,
  },
  {
    id: "op-ai-and-interviews",
    kind: "opinion",
    text: "Will AI coding assistants make coding interviews obsolete? Give your view with a reason.",
    targetDurationSec: 90,
  },
];
