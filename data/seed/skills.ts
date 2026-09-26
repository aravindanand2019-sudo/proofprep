// Skill taxonomy (PROPOSED, for team review). 27 skills: 6 aptitude, 11 DSA, 6 CS, 4 communication.
// IDs are stable Firestore document IDs; companies and questions reference them.
import type { Skill, WithId } from "../../lib/schemas/index.ts";

export const skills: WithId<Skill>[] = [
  // --- Aptitude ---
  {
    id: "apt-arithmetic",
    category: "aptitude",
    name: "Arithmetic (percentages, ratios, profit & loss, averages)",
    prerequisites: [],
  },
  {
    id: "apt-time-speed-work",
    category: "aptitude",
    name: "Time, speed, distance & work",
    prerequisites: ["apt-arithmetic"],
  },
  {
    id: "apt-number-systems",
    category: "aptitude",
    name: "Number systems (divisibility, HCF/LCM, remainders)",
    prerequisites: [],
  },
  {
    id: "apt-pnc-probability",
    category: "aptitude",
    name: "Permutations, combinations & probability",
    prerequisites: ["apt-number-systems"],
  },
  {
    id: "apt-logical",
    category: "aptitude",
    name: "Logical reasoning (series, coding-decoding, arrangements, syllogisms)",
    prerequisites: [],
  },
  {
    id: "apt-verbal",
    category: "aptitude",
    name: "Verbal ability (reading comprehension, grammar, vocabulary)",
    prerequisites: [],
  },

  // --- DSA ---
  { id: "dsa-complexity", category: "dsa", name: "Time & space complexity", prerequisites: [] },
  {
    id: "dsa-arrays-strings",
    category: "dsa",
    name: "Arrays & strings",
    prerequisites: ["dsa-complexity"],
  },
  {
    id: "dsa-hashing",
    category: "dsa",
    name: "Hashing (hash maps & sets)",
    prerequisites: ["dsa-arrays-strings"],
  },
  {
    id: "dsa-two-pointers-window",
    category: "dsa",
    name: "Two pointers & sliding window",
    prerequisites: ["dsa-arrays-strings"],
  },
  {
    id: "dsa-sorting-searching",
    category: "dsa",
    name: "Sorting & binary search",
    prerequisites: ["dsa-arrays-strings"],
  },
  {
    id: "dsa-linked-lists",
    category: "dsa",
    name: "Linked lists",
    prerequisites: ["dsa-complexity"],
  },
  {
    id: "dsa-stacks-queues",
    category: "dsa",
    name: "Stacks & queues",
    prerequisites: ["dsa-arrays-strings"],
  },
  {
    id: "dsa-recursion-backtracking",
    category: "dsa",
    name: "Recursion & backtracking",
    prerequisites: ["dsa-complexity"],
  },
  {
    id: "dsa-trees",
    category: "dsa",
    name: "Trees & binary search trees",
    prerequisites: ["dsa-recursion-backtracking", "dsa-stacks-queues"],
  },
  {
    id: "dsa-graphs",
    category: "dsa",
    name: "Graphs (BFS, DFS, shortest paths)",
    prerequisites: ["dsa-trees"],
  },
  {
    id: "dsa-dynamic-programming",
    category: "dsa",
    name: "Dynamic programming",
    prerequisites: ["dsa-recursion-backtracking"],
  },

  // --- CS fundamentals ---
  {
    id: "cs-oop",
    category: "cs",
    name: "OOP (classes, inheritance, polymorphism, SOLID basics)",
    prerequisites: [],
  },
  {
    id: "cs-os-processes",
    category: "cs",
    name: "OS: processes, threads, scheduling & synchronisation",
    prerequisites: [],
  },
  {
    id: "cs-os-memory",
    category: "cs",
    name: "OS: memory management, paging & deadlocks",
    prerequisites: ["cs-os-processes"],
  },
  { id: "cs-dbms-sql", category: "cs", name: "DBMS: SQL queries & joins", prerequisites: [] },
  {
    id: "cs-dbms-design",
    category: "cs",
    name: "DBMS: normalisation, transactions & indexing",
    prerequisites: ["cs-dbms-sql"],
  },
  {
    id: "cs-networks",
    category: "cs",
    name: "Computer networks (OSI/TCP-IP, HTTP, DNS)",
    prerequisites: [],
  },

  // --- Communication ---
  {
    id: "comm-self-intro",
    category: "communication",
    name: "Self-introduction",
    prerequisites: [],
  },
  {
    id: "comm-behavioral-star",
    category: "communication",
    name: "Behavioural answers (STAR)",
    prerequisites: [],
  },
  {
    id: "comm-technical-explanation",
    category: "communication",
    name: "Explaining a technical concept (claim-reason-example)",
    prerequisites: [],
  },
  {
    id: "comm-project-walkthrough",
    category: "communication",
    name: "Project walkthrough",
    prerequisites: ["comm-technical-explanation"],
  },
];
