// Question bank. Each item names its correct answer explicitly; the helper places it at a
// stable pseudo-random position so answer keys are not always "A". Every answer below was
// worked by hand; reviewed stays false until a teammate re-checks it (PLAN.md Section 6).
import type {
  Domain,
  Question,
  QuestionLevel,
  QuestionPool,
  WithId,
} from "../../lib/schemas/index.ts";

export type Wrong = [text: string, tag: string | null];

export type Spec = {
  id: string;
  skillId: string;
  pool: QuestionPool;
  level?: QuestionLevel;
  type?: "mcq" | "code_output" | "code_bug";
  difficulty?: number;
  time?: number;
  prompt: string;
  correct: string;
  wrong: Wrong[];
  explanation: string;
  pattern?: string;
  approach?: string;
  domains?: Domain[];
};

function position(id: string, slots: number): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % slots;
}

export function q(spec: Spec): WithId<Question> {
  const correctIndex = position(spec.id, spec.wrong.length + 1);
  const options: string[] = [];
  const distractorTags: Record<string, string> = {};
  let w = 0;
  for (let i = 0; i <= spec.wrong.length; i += 1) {
    if (i === correctIndex) {
      options.push(spec.correct);
      continue;
    }
    const [text, tag] = spec.wrong[w] ?? ["", null];
    w += 1;
    options.push(text);
    if (tag) distractorTags[String(i)] = tag;
  }
  return {
    id: spec.id,
    skillId: spec.skillId,
    type: spec.type ?? "mcq",
    level: spec.level ?? "concept",
    difficulty: spec.difficulty ?? 2,
    expectedTimeSec: spec.time ?? 60,
    prompt: spec.prompt,
    options,
    correctIndex,
    explanation: spec.explanation,
    distractorTags,
    pool: spec.pool,
    reviewed: false,
    ...(spec.pattern ? { pattern: spec.pattern } : {}),
    ...(spec.approach ? { approach: spec.approach } : {}),
    ...(spec.domains ? { domains: spec.domains } : {}),
  };
}

const specs: Spec[] = [
  // ───────────── Aptitude · quick assessment (10) ─────────────
  {
    id: "apt-a01",
    skillId: "apt-arithmetic",
    pool: "assessment",
    prompt: "A shirt's price rises by 20% and then falls by 20%. What is the net change?",
    correct: "4% decrease",
    wrong: [
      ["No change", "misconception:percent_symmetry"],
      ["4% increase", "slip"],
      ["2% decrease", null],
    ],
    explanation: "1.20 × 0.80 = 0.96, so the final price is 4% lower.",
  },
  {
    id: "apt-a02",
    skillId: "apt-arithmetic",
    pool: "assessment",
    level: "application",
    prompt:
      "The average of 5 numbers is 20. After removing one number, the average of the rest is 18. Which number was removed?",
    correct: "28",
    wrong: [
      ["20", "misconception:average_unchanged"],
      ["22", "slip"],
      ["38", null],
    ],
    explanation: "Total = 5 × 20 = 100; remaining total = 4 × 18 = 72; removed = 100 − 72 = 28.",
  },
  {
    id: "apt-a03",
    skillId: "apt-time-speed-work",
    pool: "assessment",
    prompt: "A finishes a job in 12 days and B in 6 days. Working together, how long do they take?",
    correct: "4 days",
    wrong: [
      ["9 days", "misconception:average_the_times"],
      ["3 days", "slip"],
      ["6 days", null],
    ],
    explanation: "Rates add: 1/12 + 1/6 = 3/12 = 1/4 of the job per day, so 4 days.",
  },
  {
    id: "apt-a04",
    skillId: "apt-time-speed-work",
    pool: "assessment",
    level: "application",
    prompt: "A 150 m long train passes a pole in 10 seconds. What is its speed?",
    correct: "54 km/h",
    wrong: [
      ["15 km/h", "misconception:unit_conversion"],
      ["45 km/h", "slip"],
      ["36 km/h", null],
    ],
    explanation: "150 m / 10 s = 15 m/s; × 18/5 = 54 km/h.",
  },
  {
    id: "apt-a05",
    skillId: "apt-number-systems",
    pool: "assessment",
    difficulty: 3,
    prompt: "What is the remainder when 2¹⁰ is divided by 7?",
    correct: "2",
    wrong: [
      ["1", "misconception:cyclicity_off_by_one"],
      ["4", "slip"],
      ["3", null],
    ],
    explanation: "2³ = 8 ≡ 1 (mod 7), so 2¹⁰ = (2³)³ × 2 ≡ 1 × 2 = 2.",
  },
  {
    id: "apt-a06",
    skillId: "apt-number-systems",
    pool: "assessment",
    difficulty: 1,
    prompt: "What is the LCM of 12 and 18?",
    correct: "36",
    wrong: [
      ["6", "misconception:hcf_vs_lcm"],
      ["216", "misconception:product_is_lcm"],
      ["72", null],
    ],
    explanation: "12 = 2²·3 and 18 = 2·3²; LCM = 2²·3² = 36. (6 is the HCF.)",
  },
  {
    id: "apt-a07",
    skillId: "apt-pnc-probability",
    pool: "assessment",
    prompt: "Two fair coins are tossed. What is the probability of getting at least one head?",
    correct: "3/4",
    wrong: [
      ["1/2", "misconception:exactly_vs_at_least"],
      ["2/3", "misconception:unordered_outcomes"],
      ["1/4", "slip"],
    ],
    explanation: "Only TT has no head: 1 − 1/4 = 3/4.",
  },
  {
    id: "apt-a08",
    skillId: "apt-pnc-probability",
    pool: "assessment",
    prompt: 'In how many distinct ways can the letters of "BOOK" be arranged?',
    correct: "12",
    wrong: [
      ["24", "misconception:ignore_repeats"],
      ["6", null],
      ["16", null],
    ],
    explanation: "4 letters with O repeated twice: 4! / 2! = 12.",
  },
  {
    id: "apt-a09",
    skillId: "apt-logical",
    pool: "assessment",
    prompt: "Find the next number: 2, 6, 12, 20, 30, ?",
    correct: "42",
    wrong: [
      ["40", "slip"],
      ["44", null],
      ["36", null],
    ],
    explanation: "Differences are 4, 6, 8, 10, so the next is +12: 30 + 12 = 42.",
  },
  {
    id: "apt-a10",
    skillId: "apt-verbal",
    pool: "assessment",
    difficulty: 1,
    time: 30,
    prompt: 'Choose the word closest in meaning to "candid".',
    correct: "Frank",
    wrong: [
      ["Careful", null],
      ["Hidden", "misconception:antonym_confusion"],
      ["Proud", null],
    ],
    explanation: "Candid means honest and direct: frank.",
  },

  // ───────────── Coding / code reasoning · quick assessment (10) ─────────────
  {
    id: "dsa-a01",
    skillId: "dsa-complexity",
    pool: "assessment",
    prompt:
      "What is the time complexity?\n\nfor i in range(n):\n    for j in range(i, n):\n        total += 1",
    correct: "O(n²)",
    wrong: [
      ["O(n)", "misconception:inner_loop_shrinks"],
      ["O(n log n)", null],
      ["O(2ⁿ)", null],
    ],
    explanation: "The inner loop runs n + (n−1) + … + 1 = n(n+1)/2 times, which is O(n²).",
  },
  {
    id: "dsa-a02",
    skillId: "dsa-complexity",
    pool: "assessment",
    prompt: "What is the time complexity?\n\ni = n\nwhile i > 1:\n    i = i // 2",
    correct: "O(log n)",
    wrong: [
      ["O(n)", null],
      ["O(n/2)", "misconception:constant_factors"],
      ["O(1)", null],
    ],
    explanation: "i halves every iteration, so the loop runs about log₂ n times.",
  },
  {
    id: "dsa-a03",
    skillId: "dsa-arrays-strings",
    pool: "assessment",
    type: "code_output",
    prompt:
      "What does this print?\n\na = [1, 2, 3, 4, 5]\ns = 0\nfor i in range(0, len(a), 2):\n    s += a[i]\nprint(s)",
    correct: "9",
    wrong: [
      ["15", "misconception:ignores_step"],
      ["6", "slip"],
      ["8", null],
    ],
    explanation: "Indices 0, 2, 4 → 1 + 3 + 5 = 9.",
  },
  {
    id: "dsa-a04",
    skillId: "dsa-hashing",
    pool: "assessment",
    prompt: "What is the average time to look up a key in a hash map?",
    correct: "O(1)",
    wrong: [
      ["O(log n)", "misconception:hash_is_tree"],
      ["O(n)", "misconception:worst_case_as_average"],
      ["O(n log n)", null],
    ],
    explanation:
      "Hashing jumps straight to a bucket; with a good hash function the average is O(1).",
  },
  {
    id: "dsa-a05",
    skillId: "dsa-two-pointers-window",
    pool: "assessment",
    type: "code_output",
    level: "application",
    difficulty: 3,
    time: 90,
    prompt:
      "What does this print?\n\nnums = [1, 2, 3, 4, 6]\ntarget = 6\nl, r = 0, len(nums) - 1\nwhile l < r:\n    s = nums[l] + nums[r]\n    if s == target:\n        break\n    if s < target:\n        l += 1\n    else:\n        r -= 1\nprint(l, r)",
    correct: "1 3",
    wrong: [
      ["0 4", "slip"],
      ["0 3", "misconception:pointer_direction"],
      ["2 3", null],
    ],
    explanation: "(0,4): 1+6=7 > 6 → r=3. (0,3): 1+4=5 < 6 → l=1. (1,3): 2+4=6 → stop.",
  },
  {
    id: "dsa-a06",
    skillId: "dsa-sorting-searching",
    pool: "assessment",
    type: "code_bug",
    level: "application",
    difficulty: 3,
    time: 90,
    prompt:
      "What does search([5], 5) return?\n\ndef search(a, x):\n    lo, hi = 0, len(a) - 1\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if a[mid] == x:\n            return mid\n        if a[mid] < x:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1",
    correct: "-1",
    wrong: [
      ["0", "misconception:loop_condition"],
      ["IndexError", null],
      ["1", null],
    ],
    explanation:
      "lo = hi = 0, so `lo < hi` is false and the loop never runs. The bug: it should be `lo <= hi`.",
  },
  {
    id: "dsa-a07",
    skillId: "dsa-linked-lists",
    pool: "assessment",
    prompt: "How much extra space does reversing a singly linked list in place need?",
    correct: "O(1)",
    wrong: [
      ["O(n)", "misconception:needs_copy"],
      ["O(log n)", null],
      ["O(n²)", null],
    ],
    explanation: "Three pointers (prev, curr, next) are enough: constant extra space.",
  },
  {
    id: "dsa-a08",
    skillId: "dsa-stacks-queues",
    pool: "assessment",
    type: "code_output",
    prompt:
      'What does this print?\n\ns = []\nfor ch in "(()":\n    if ch == "(":\n        s.append(ch)\n    elif s:\n        s.pop()\nprint(len(s))',
    correct: "1",
    wrong: [
      ["0", "misconception:balanced_assumption"],
      ["2", "slip"],
      ["3", null],
    ],
    explanation: "Push, push, pop → one '(' left on the stack.",
  },
  {
    id: "dsa-a09",
    skillId: "dsa-recursion-backtracking",
    pool: "assessment",
    type: "code_output",
    prompt:
      "What does this print?\n\ndef f(n):\n    if n <= 1:\n        return n\n    return f(n - 1) + f(n - 2)\n\nprint(f(6))",
    correct: "8",
    wrong: [
      ["13", "misconception:fib_off_by_one"],
      ["5", "slip"],
      ["6", null],
    ],
    explanation: "f(0..6) = 0, 1, 1, 2, 3, 5, 8.",
  },
  {
    id: "dsa-a10",
    skillId: "dsa-trees",
    pool: "assessment",
    prompt: "An inorder traversal of a binary search tree visits the nodes in…",
    correct: "Sorted (ascending) order",
    wrong: [
      ["Level order", "misconception:bfs_vs_dfs"],
      ["Reverse insertion order", null],
      ["No particular order", null],
    ],
    explanation: "Left subtree < node < right subtree, so left-node-right yields ascending order.",
  },

  // ───────────── Mock interview round 1 (10): technical + aptitude ─────────────
  {
    id: "mock-01",
    skillId: "cs-os-processes",
    pool: "mock",
    prompt: "Which of these is NOT one of the four necessary conditions for deadlock?",
    correct: "Preemption",
    wrong: [
      ["Mutual exclusion", null],
      ["Hold and wait", null],
      ["Circular wait", null],
    ],
    explanation:
      "The conditions are mutual exclusion, hold and wait, NO preemption, circular wait.",
  },
  {
    id: "mock-02",
    skillId: "cs-dbms-sql",
    pool: "mock",
    prompt: "Which SQL clause filters groups after aggregation?",
    correct: "HAVING",
    wrong: [
      ["WHERE", "misconception:where_vs_having"],
      ["ORDER BY", null],
      ["GROUP BY", null],
    ],
    explanation: "WHERE filters rows before grouping; HAVING filters groups after aggregation.",
  },
  {
    id: "mock-03",
    skillId: "cs-networks",
    pool: "mock",
    prompt: "Which transport protocol is connectionless?",
    correct: "UDP",
    wrong: [
      ["TCP", "misconception:tcp_udp_swap"],
      ["HTTP/1.1", null],
      ["FTP", null],
    ],
    explanation: "UDP sends datagrams without a handshake; TCP is connection-oriented.",
  },
  {
    id: "mock-04",
    skillId: "cs-oop",
    pool: "mock",
    prompt: "Method overloading is an example of…",
    correct: "Compile-time polymorphism",
    wrong: [
      ["Runtime polymorphism", "misconception:overload_vs_override"],
      ["Encapsulation", null],
      ["Inheritance", null],
    ],
    explanation:
      "The overload is chosen by the compiler from the argument types; overriding is runtime.",
  },
  {
    id: "mock-05",
    skillId: "cs-dbms-design",
    pool: "mock",
    difficulty: 3,
    prompt: "A relation in 2NF with no transitive dependencies of non-key attributes is in…",
    correct: "3NF",
    wrong: [
      ["BCNF necessarily", "misconception:3nf_equals_bcnf"],
      ["1NF only", null],
      ["4NF", null],
    ],
    explanation: "That is the definition of 3NF. BCNF is stricter.",
  },
  {
    id: "mock-06",
    skillId: "cs-os-memory",
    pool: "mock",
    prompt: "Thrashing happens when…",
    correct: "The system spends more time paging than executing processes",
    wrong: [
      ["The CPU waits only on disk I/O", null],
      ["A process creates too many threads", "misconception:thrashing_threads"],
      ["The CPU cache is disabled", null],
    ],
    explanation: "Too little memory per process causes constant page faults, so paging dominates.",
  },
  {
    id: "mock-07",
    skillId: "apt-arithmetic",
    pool: "mock",
    difficulty: 1,
    time: 45,
    prompt: "If 30% of x is 45, what is x?",
    correct: "150",
    wrong: [
      ["135", null],
      ["13.5", "misconception:multiply_instead_of_divide"],
      ["165", null],
    ],
    explanation: "x = 45 / 0.30 = 150.",
  },
  {
    id: "mock-08",
    skillId: "apt-time-speed-work",
    pool: "mock",
    level: "application",
    difficulty: 3,
    prompt:
      "A car goes 120 km at 40 km/h and returns the same distance at 60 km/h. What is the average speed for the round trip?",
    correct: "48 km/h",
    wrong: [
      ["50 km/h", "misconception:arithmetic_mean_speed"],
      ["52 km/h", null],
      ["45 km/h", null],
    ],
    explanation: "Time = 3 h + 2 h = 5 h for 240 km → 48 km/h (the harmonic mean, not 50).",
  },
  {
    id: "mock-09",
    skillId: "apt-logical",
    pool: "mock",
    prompt: "All roses are flowers. Some flowers fade quickly. Which statement must be true?",
    correct: "None of these must be true",
    wrong: [
      ["Some roses fade quickly", "misconception:undistributed_middle"],
      ["All roses fade quickly", null],
      ["No rose fades quickly", null],
    ],
    explanation:
      "The flowers that fade quickly may not include any roses, so nothing about roses follows.",
  },
  {
    id: "mock-10",
    skillId: "apt-pnc-probability",
    pool: "mock",
    difficulty: 1,
    prompt: "A bag has 3 red and 2 blue balls. One is drawn at random. P(blue)?",
    correct: "2/5",
    wrong: [
      ["2/3", "misconception:ratio_vs_probability"],
      ["3/5", "slip"],
      ["1/2", null],
    ],
    explanation: "2 favourable out of 5 total.",
  },

  // ───────────── Practice pool: aptitude (10) ─────────────
  {
    id: "apt-p01",
    skillId: "apt-arithmetic",
    pool: "practice",
    prompt: "Bought for ₹800, sold for ₹1000. What is the profit percentage?",
    correct: "25%",
    wrong: [
      ["20%", "misconception:profit_on_selling_price"],
      ["200%", "slip"],
      ["12.5%", null],
    ],
    explanation: "Profit 200 on cost 800 = 25%. (20% would be on the selling price.)",
  },
  {
    id: "apt-p02",
    skillId: "apt-arithmetic",
    pool: "practice",
    difficulty: 1,
    prompt: "Boys : girls = 3 : 2 in a class of 40. How many girls?",
    correct: "16",
    wrong: [
      ["24", "slip"],
      ["20", null],
      ["12", null],
    ],
    explanation: "Girls are 2/5 of 40 = 16.",
  },
  {
    id: "apt-p03",
    skillId: "apt-time-speed-work",
    pool: "practice",
    level: "application",
    prompt:
      "Pipe A fills a tank in 4 h; pipe B empties it in 6 h. With both open, how long to fill it?",
    correct: "12 h",
    wrong: [
      ["2.4 h", "misconception:add_rates_for_leak"],
      ["10 h", null],
      ["5 h", null],
    ],
    explanation: "Net rate = 1/4 − 1/6 = 1/12 of the tank per hour → 12 h.",
  },
  {
    id: "apt-p04",
    skillId: "apt-time-speed-work",
    pool: "practice",
    level: "application",
    difficulty: 3,
    time: 90,
    prompt:
      "Walking at 5 km/h a man is 10 minutes late; at 6 km/h he is 5 minutes early. How far is his destination?",
    correct: "7.5 km",
    wrong: [
      ["5 km", null],
      ["10 km", null],
      ["6 km", null],
    ],
    explanation: "d/5 − d/6 = 15 min = 1/4 h → d/30 = 1/4 → d = 7.5 km.",
  },
  {
    id: "apt-p05",
    skillId: "apt-number-systems",
    pool: "practice",
    difficulty: 3,
    prompt: "What is the unit digit of 7⁹⁵?",
    correct: "3",
    wrong: [
      ["7", "misconception:cyclicity_off_by_one"],
      ["9", "slip"],
      ["1", null],
    ],
    explanation: "Unit digits of 7ⁿ cycle 7, 9, 3, 1. 95 mod 4 = 3 → third in the cycle: 3.",
  },
  {
    id: "apt-p06",
    skillId: "apt-number-systems",
    pool: "practice",
    level: "application",
    prompt: "How many integers from 1 to 100 are divisible by 3 or 5?",
    correct: "47",
    wrong: [
      ["53", "misconception:no_inclusion_exclusion"],
      ["41", null],
      ["45", null],
    ],
    explanation: "33 (by 3) + 20 (by 5) − 6 (by 15) = 47.",
  },
  {
    id: "apt-p07",
    skillId: "apt-pnc-probability",
    pool: "practice",
    difficulty: 1,
    prompt: "In how many ways can a 2-person committee be chosen from 5 people?",
    correct: "10",
    wrong: [
      ["20", "misconception:order_matters"],
      ["25", null],
      ["5", null],
    ],
    explanation: "C(5, 2) = 10. (20 counts ordered pairs.)",
  },
  {
    id: "apt-p08",
    skillId: "apt-logical",
    pool: "practice",
    difficulty: 1,
    prompt: "If CAT is coded as DBU, how is DOG coded?",
    correct: "EPH",
    wrong: [
      ["EPG", "slip"],
      ["ENH", null],
      ["CNF", "misconception:shift_direction"],
    ],
    explanation: "Each letter shifts forward by one: D→E, O→P, G→H.",
  },
  {
    id: "apt-p09",
    skillId: "apt-logical",
    pool: "practice",
    prompt:
      'Pointing to a man, Riya says: "He is the son of my grandfather\'s only son." How is the man related to Riya?',
    correct: "Brother",
    wrong: [
      ["Cousin", "misconception:relation_chain"],
      ["Uncle", null],
      ["Father", null],
    ],
    explanation: "Her grandfather's only son is her father; her father's son is her brother.",
  },
  {
    id: "apt-p10",
    skillId: "apt-verbal",
    pool: "practice",
    difficulty: 1,
    time: 30,
    prompt: "Choose the grammatically correct sentence.",
    correct: "Neither of the answers is correct.",
    wrong: [
      ["Neither of the answers are correct.", "misconception:subject_verb_agreement"],
      ["Neither of the answer is correct.", null],
      ["Neither of answers are correct.", null],
    ],
    explanation: '"Neither" is singular, so it takes "is".',
  },

  // ───────────── Practice pool: DSA (10) ─────────────
  {
    id: "dsa-p01",
    skillId: "dsa-graphs",
    pool: "practice",
    prompt: "BFS on an unweighted graph finds…",
    correct: "Shortest paths by number of edges",
    wrong: [
      ["A minimum spanning tree", "misconception:bfs_mst"],
      ["Shortest paths with negative weights", null],
      ["A topological order of any graph", null],
    ],
    explanation:
      "BFS explores in layers, so the first time it reaches a node is via the fewest edges.",
  },
  {
    id: "dsa-p02",
    skillId: "dsa-dynamic-programming",
    pool: "practice",
    level: "application",
    prompt: "How many ways are there to climb 5 stairs taking 1 or 2 steps at a time?",
    correct: "8",
    wrong: [
      ["5", "misconception:fib_off_by_one"],
      ["13", null],
      ["10", null],
    ],
    explanation: "ways(n) = ways(n−1) + ways(n−2): 1, 2, 3, 5, 8.",
  },
  {
    id: "dsa-p03",
    skillId: "dsa-hashing",
    pool: "practice",
    level: "application",
    prompt: "Which approach checks an array for duplicates in O(n) average time?",
    correct: "Insert each element into a hash set, checking membership first",
    wrong: [
      ["Sort, then binary search each element", "misconception:complexity_of_sorting"],
      ["Compare every pair with nested loops", null],
      ["Push everything onto a stack", null],
    ],
    explanation: "One pass with O(1) average set lookups is O(n). Sorting alone is O(n log n).",
  },
  {
    id: "dsa-p04",
    skillId: "dsa-two-pointers-window",
    pool: "practice",
    level: "application",
    prompt:
      'What is the length of the longest substring without repeating characters in "abcabcbb"?',
    correct: "3",
    wrong: [
      ["4", "slip"],
      ["2", null],
      ["8", null],
    ],
    explanation: '"abc" is the longest window before a character repeats.',
  },
  {
    id: "dsa-p05",
    skillId: "dsa-sorting-searching",
    pool: "practice",
    prompt: "Which of these sorting algorithms is stable?",
    correct: "Merge sort",
    wrong: [
      ["Quick sort (typical in-place version)", "misconception:stability"],
      ["Heap sort", null],
      ["Selection sort", null],
    ],
    explanation: "Merge sort keeps equal elements in their original order when merging.",
  },
  {
    id: "dsa-p06",
    skillId: "dsa-linked-lists",
    pool: "practice",
    prompt: "How do you detect a cycle in a linked list using O(1) extra space?",
    correct: "Fast and slow pointers",
    wrong: [
      ["A hash set of visited nodes", "misconception:space_constraint"],
      ["Recursion", null],
      ["Sorting the nodes", null],
    ],
    explanation: "Floyd's algorithm: if there is a cycle, the fast pointer meets the slow one.",
  },
  {
    id: "dsa-p07",
    skillId: "dsa-stacks-queues",
    pool: "practice",
    difficulty: 1,
    prompt: "Which data structure drives breadth-first search?",
    correct: "Queue",
    wrong: [
      ["Stack", "misconception:bfs_dfs_swap"],
      ["Heap", null],
      ["Hash map", null],
    ],
    explanation: "BFS processes nodes first-in, first-out. A stack gives DFS.",
  },
  {
    id: "dsa-p08",
    skillId: "dsa-trees",
    pool: "practice",
    prompt: "The height of a balanced binary tree with n nodes is…",
    correct: "O(log n)",
    wrong: [
      ["O(n)", "misconception:skewed_tree"],
      ["O(√n)", null],
      ["O(1)", null],
    ],
    explanation:
      "Each level doubles the node count, so height grows logarithmically. O(n) is a skewed tree.",
  },
  {
    id: "dsa-p09",
    skillId: "dsa-recursion-backtracking",
    pool: "practice",
    prompt: "How many subsets does a set of 4 elements have?",
    correct: "16",
    wrong: [
      ["15", "misconception:excludes_empty_set"],
      ["8", null],
      ["24", "misconception:permutations_vs_subsets"],
    ],
    explanation: "Each element is in or out: 2⁴ = 16, including the empty set.",
  },
  {
    id: "dsa-p10",
    skillId: "dsa-arrays-strings",
    pool: "practice",
    type: "code_output",
    prompt: 'What does this print?\n\ns = "racecar"\nprint(s == s[::-1], s[1:4])',
    correct: "True ace",
    wrong: [
      ["True acec", "misconception:slice_end_inclusive"],
      ["True rac", "misconception:zero_vs_one_index"],
      ["False ace", null],
    ],
    explanation: '"racecar" is a palindrome; s[1:4] takes indices 1, 2, 3 → "ace" (end excluded).',
  },

  // ───────────── Practice pool: CS fundamentals (10) ─────────────
  {
    id: "cs-p01",
    skillId: "cs-oop",
    pool: "practice",
    difficulty: 1,
    prompt: "Which OOP principle hides an object's internal state behind methods?",
    correct: "Encapsulation",
    wrong: [
      ["Abstraction", "misconception:abstraction_vs_encapsulation"],
      ["Polymorphism", null],
      ["Inheritance", null],
    ],
    explanation: "Encapsulation bundles state with methods and restricts direct access.",
  },
  {
    id: "cs-p02",
    skillId: "cs-oop",
    pool: "practice",
    type: "code_output",
    level: "application",
    prompt:
      'What does this Java code print?\n\nclass A { void show() { System.out.print("A"); } }\nclass B extends A { void show() { System.out.print("B"); } }\n\nA obj = new B();\nobj.show();',
    correct: "B",
    wrong: [
      ["A", "misconception:static_type_dispatch"],
      ["Compile error", null],
      ["AB", null],
    ],
    explanation: "Overridden methods dispatch on the runtime type (B), not the declared type (A).",
  },
  {
    id: "cs-p03",
    skillId: "cs-os-processes",
    pool: "practice",
    prompt: "Threads of the same process share…",
    correct: "Heap memory",
    wrong: [
      ["Their stacks", "misconception:threads_share_stack"],
      ["Program counter", null],
      ["Registers", null],
    ],
    explanation: "Each thread has its own stack, registers and PC; the heap and code are shared.",
  },
  {
    id: "cs-p04",
    skillId: "cs-os-processes",
    pool: "practice",
    prompt: "Which CPU scheduling algorithm can starve long jobs?",
    correct: "Shortest Job First",
    wrong: [
      ["Round Robin", null],
      ["First Come First Served", "misconception:convoy_vs_starvation"],
      ["None of them", null],
    ],
    explanation: "SJF keeps picking short jobs, so a long job may wait forever.",
  },
  {
    id: "cs-p05",
    skillId: "cs-os-memory",
    pool: "practice",
    level: "application",
    prompt: "With 4 KB (4096-byte) pages, which page number holds logical address 10000?",
    correct: "2",
    wrong: [
      ["3", "misconception:round_up"],
      ["1", null],
      ["10", null],
    ],
    explanation: "10000 / 4096 = 2.44…, so page 2 (pages are numbered from 0).",
  },
  {
    id: "cs-p06",
    skillId: "cs-dbms-sql",
    pool: "practice",
    prompt: "COUNT(*) and COUNT(col) give different results when…",
    correct: "col contains NULLs",
    wrong: [
      ["The table has duplicate rows", null],
      ["The table is indexed", null],
      ["Never; they are equivalent", "misconception:count_star_same"],
    ],
    explanation: "COUNT(col) skips NULLs; COUNT(*) counts every row.",
  },
  {
    id: "cs-p07",
    skillId: "cs-dbms-sql",
    pool: "practice",
    prompt: "A LEFT JOIN returns…",
    correct: "All rows from the left table, with right-table matches or NULLs",
    wrong: [
      ["Only rows that match in both tables", "misconception:inner_vs_left"],
      ["All rows from both tables", null],
      ["All rows from the right table", null],
    ],
    explanation: "Left rows are always kept; missing matches become NULLs.",
  },
  {
    id: "cs-p08",
    skillId: "cs-dbms-design",
    pool: "practice",
    prompt: 'In ACID, "Isolation" guarantees that…',
    correct: "Concurrent transactions don't see each other's partial changes",
    wrong: [
      ["A transaction is all-or-nothing", "misconception:atomicity_vs_isolation"],
      ["Committed data survives a crash", null],
      ["Constraints always hold", null],
    ],
    explanation: "All-or-nothing is Atomicity; surviving crashes is Durability.",
  },
  {
    id: "cs-p09",
    skillId: "cs-networks",
    pool: "practice",
    difficulty: 1,
    prompt: "Which layer of the OSI model does IP belong to?",
    correct: "Network",
    wrong: [
      ["Transport", "misconception:ip_transport"],
      ["Data link", null],
      ["Application", null],
    ],
    explanation: "IP routes packets between networks: layer 3, the network layer.",
  },
  {
    id: "cs-p10",
    skillId: "cs-networks",
    pool: "practice",
    difficulty: 1,
    prompt: "What does DNS primarily do?",
    correct: "Maps domain names to IP addresses",
    wrong: [
      ["Assigns IP addresses to devices", "misconception:dns_vs_dhcp"],
      ["Encrypts web traffic", null],
      ["Routes packets between networks", null],
    ],
    explanation: "DNS resolves names; DHCP assigns addresses.",
  },
];

export const questions: WithId<Question>[] = specs.map(q);
