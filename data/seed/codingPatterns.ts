// Domain-specific coding-pattern questions for Daily Practice: "which approach solves this
// best?". Each names the pattern and a step-by-step approach, revealed after answering.
// 8 per domain; reviewed stays false until a teammate re-checks them.
import type { Question, WithId } from "../../lib/schemas/index.ts";
import { q, type Spec } from "./questions.ts";

type PatternSpec = Omit<Spec, "pool" | "level" | "type" | "time"> & {
  pattern: string;
  approach: string;
};

const pattern = (spec: PatternSpec): WithId<Question> =>
  q({
    ...spec,
    pool: "practice",
    level: "application",
    time: 90,
    difficulty: spec.difficulty ?? 3,
  });

const BRUTE = "misconception:brute_force";
const SLOWER = "misconception:suboptimal_approach";
const WRONG_PATTERN = "misconception:wrong_pattern";
const GREEDY = "misconception:greedy_fails";

const specs: PatternSpec[] = [
  // ───────────── Product SDE (Amazon, Microsoft, Zoho) ─────────────
  {
    id: "pat-sde-01",
    domains: ["sde"],
    skillId: "dsa-two-pointers-window",
    pattern: "Two pointers",
    prompt: "A sorted array and a target K: does any pair sum to K? Which approach is best?",
    correct:
      "Two pointers from both ends: move left up if the sum is too small, right down if too big (O(n), O(1) space)",
    wrong: [
      ["Check every pair with nested loops (O(n²))", BRUTE],
      ["For each element, binary search for K − a[i] (O(n log n))", SLOWER],
      ["Push elements onto a stack and compare with the top", WRONG_PATTERN],
    ],
    explanation:
      "Sorted order means moving a pointer never skips a valid pair, so one pass suffices: O(n) time, O(1) space.",
    approach:
      "1) l = 0, r = n − 1. 2) While l < r: s = a[l] + a[r]. 3) If s == K, found. If s < K, l++ (need bigger). Else r-- (need smaller).",
  },
  {
    id: "pat-sde-02",
    domains: ["sde"],
    skillId: "dsa-two-pointers-window",
    pattern: "Sliding window (variable size)",
    prompt: "Find the longest substring with at most K distinct characters. Which approach?",
    correct:
      "Variable sliding window with a hash map of character counts; shrink from the left while distinct > K (O(n))",
    wrong: [
      ["Check every substring and count its distinct characters (O(n²) or worse)", BRUTE],
      [
        "A fixed window of length K slid across the string",
        "misconception:fixed_vs_variable_window",
      ],
      ["Sort the characters, then scan", "misconception:loses_order"],
    ],
    explanation: "Each index enters and leaves the window once, so the total work is O(n).",
    approach:
      "1) Expand r, counting s[r]. 2) While the map has > K keys, decrement s[l] (delete at 0) and l++. 3) Track max(r − l + 1).",
  },
  {
    id: "pat-sde-03",
    domains: ["sde"],
    skillId: "dsa-stacks-queues",
    pattern: "Monotonic stack",
    prompt:
      "For each element of an array, find the next greater element to its right. Which approach?",
    correct:
      "Monotonic decreasing stack of indices: pop while the current value is greater, answering each popped index (O(n))",
    wrong: [
      ["For each element, scan everything to its right (O(n²))", BRUTE],
      ["Sort the array and binary search each element", "misconception:loses_order"],
      ["A min-heap of all elements", WRONG_PATTERN],
    ],
    explanation: "Each index is pushed and popped at most once, so the whole pass is O(n).",
    approach:
      "1) Scan left to right. 2) While stack not empty and a[i] > a[top]: ans[top] = a[i], pop. 3) Push i. 4) Indices left on the stack have no greater element (−1).",
  },
  {
    id: "pat-sde-04",
    domains: ["sde"],
    skillId: "dsa-sorting-searching",
    pattern: "Binary search on the answer",
    difficulty: 4,
    prompt:
      "Ship packages in the given order within D days; find the minimum ship capacity. Which approach?",
    correct:
      "Binary search the capacity between max(weight) and sum(weights), checking each guess greedily in O(n)",
    wrong: [
      ["Try every capacity from 1 upward until one works", BRUTE],
      ["Sort the packages by weight and pack greedily", "misconception:order_matters"],
      ["DP over days × packages (O(n²·D))", SLOWER],
    ],
    explanation:
      "Feasibility is monotonic (a bigger capacity never hurts), so binary search works: O(n log(sum)).",
    approach:
      "1) lo = max(w), hi = sum(w). 2) mid works if packing in order needs ≤ D days. 3) If it works, hi = mid, else lo = mid + 1. 4) Answer = lo.",
  },
  {
    id: "pat-sde-05",
    domains: ["sde"],
    skillId: "dsa-graphs",
    pattern: "BFS (unweighted shortest path)",
    prompt:
      "Minimum number of knight moves from square A to square B on a chessboard. Which approach?",
    correct: "BFS from A: every move costs 1, so the first time B is reached is optimal",
    wrong: [
      ["DFS exploring all paths, keeping the shortest", "misconception:dfs_for_shortest_path"],
      ["Greedy: always make the move that gets closest to B", GREEDY],
      ["Sort the squares by distance to B", WRONG_PATTERN],
    ],
    explanation:
      "In an unweighted graph BFS visits nodes in order of distance, giving shortest paths in O(V + E).",
    approach:
      "1) Queue ← (A, 0), mark A visited. 2) Pop (cell, d); if cell == B return d. 3) Push each unvisited, on-board knight move with d + 1.",
  },
  {
    id: "pat-sde-06",
    domains: ["sde"],
    skillId: "dsa-sorting-searching",
    pattern: "Heap (top-k)",
    prompt:
      "Return the k largest numbers from a stream of n numbers, where k is much smaller than n. Which approach?",
    correct:
      "A min-heap of size k: push each number, pop the smallest when size exceeds k (O(n log k), O(k) memory)",
    wrong: [
      ["Store everything, sort, and take the last k (O(n log n), O(n) memory)", SLOWER],
      ["Keep only a single running maximum", "misconception:k_equals_one"],
      ["A queue of the last k numbers seen", WRONG_PATTERN],
    ],
    explanation:
      "The heap root is the smallest of the current top k, so anything smaller can be dropped immediately.",
    approach:
      "1) For each x: push x. 2) If heap size > k, pop the minimum. 3) At the end the heap holds the k largest.",
  },
  {
    id: "pat-sde-07",
    domains: ["sde"],
    skillId: "dsa-dynamic-programming",
    pattern: "DP + binary search (LIS)",
    difficulty: 4,
    prompt: "Length of the longest strictly increasing subsequence. Which approach is optimal?",
    correct:
      "Keep tails[i] = smallest tail of an increasing subsequence of length i+1; binary search each element's slot (O(n log n))",
    wrong: [
      ["Greedy: extend whenever the next element is larger", GREEDY],
      ["Sort the array and count distinct values", "misconception:loses_order"],
      ["Two pointers from both ends", WRONG_PATTERN],
    ],
    explanation:
      "Greedy extension fails on [3, 10, 2, 3, 4]. The tails array stays sorted, so each update is a binary search.",
    approach:
      "1) For each x: find the first tail ≥ x (lower bound). 2) Replace it with x, or append x if none. 3) Answer = tails.length. (The O(n²) DP dp[i] = 1 + max dp[j] for a[j] < a[i] is also correct but slower.)",
  },
  {
    id: "pat-sde-08",
    domains: ["sde"],
    skillId: "dsa-recursion-backtracking",
    pattern: "Backtracking",
    prompt: "Generate all valid combinations of n pairs of parentheses. Which approach?",
    correct: "Backtracking: add '(' while open < n, add ')' while close < open",
    wrong: [
      ["Generate all 2^(2n) strings and filter the valid ones", BRUTE],
      ["DP computing the Catalan number", "misconception:count_vs_generate"],
      ["Validate one string with a stack", WRONG_PATTERN],
    ],
    explanation:
      "The two constraints prune every invalid prefix, so only valid strings are ever built.",
    approach:
      "1) build(s, open, close). 2) If len(s) == 2n, record s. 3) If open < n: build(s + '(', open + 1, close). 4) If close < open: build(s + ')', open, close + 1).",
  },

  // ───────────── Full-stack / Web ─────────────
  {
    id: "pat-fs-01",
    domains: ["fullstack"],
    skillId: "dsa-linked-lists",
    pattern: "Hash map + doubly linked list (LRU cache)",
    difficulty: 4,
    prompt: "Build an LRU cache for API responses with O(1) get and put. Which design?",
    correct: "A hash map from key to node, plus a doubly linked list ordered by recency",
    wrong: [
      ["An array kept sorted by last-used time", "misconception:complexity_of_sorting"],
      [
        "A hash map with timestamps; scan for the oldest entry on eviction",
        "misconception:hidden_linear_scan",
      ],
      ["A queue of keys only", WRONG_PATTERN],
    ],
    explanation:
      "The map finds the node in O(1); the list moves it to the front or evicts the tail in O(1).",
    approach:
      "get: look up the node, move it to the head, return its value. put: update or insert at the head; if over capacity, remove the tail node and delete its key from the map.",
  },
  {
    id: "pat-fs-02",
    domains: ["fullstack"],
    skillId: "dsa-stacks-queues",
    pattern: "Sliding window + queue",
    prompt:
      "Rate limiter: allow at most 100 requests per user in any rolling 60 seconds. Which approach is correct?",
    correct:
      "A per-user queue of timestamps: drop entries older than 60 s, allow if fewer than 100 remain",
    wrong: [
      ["A counter that resets at the start of every minute", "misconception:fixed_window_burst"],
      ["Store every request ever and count them on each call", BRUTE],
      ["Allow requests randomly with probability 0.5", null],
    ],
    explanation:
      "A fixed window lets 200 requests through around a minute boundary; a sliding window never does.",
    approach:
      "1) On request at time t: pop from the front while front ≤ t − 60. 2) If size < 100, push t and allow; else reject.",
  },
  {
    id: "pat-fs-03",
    domains: ["fullstack"],
    skillId: "dsa-graphs",
    pattern: "Topological sort",
    prompt:
      "Compute an install order for packages from 'A depends on B' pairs, and detect circular dependencies. Which approach?",
    correct:
      "Topological sort with Kahn's algorithm (in-degrees + queue); nodes never processed indicate a cycle",
    wrong: [
      ["Sort package names alphabetically", null],
      ["Plain DFS without tracking the current recursion path", "misconception:cycle_detection"],
      ["BFS from an arbitrary package", WRONG_PATTERN],
    ],
    explanation:
      "Kahn's algorithm only releases a package once all its dependencies are done; a cycle leaves nodes stuck.",
    approach:
      "1) Edge B → A for 'A depends on B'; count in-degrees. 2) Queue all in-degree-0 nodes. 3) Pop, append to order, decrement neighbours, enqueue new zeros. 4) If order.length < nodes, there's a cycle.",
  },
  {
    id: "pat-fs-04",
    domains: ["fullstack"],
    skillId: "dsa-trees",
    pattern: "Trie",
    prompt:
      "Search-box autocomplete over 100k words, answering a query on every keystroke. Which structure?",
    correct:
      "A trie: walk the typed prefix in O(prefix length), then collect words under that node",
    wrong: [
      ["Scan all 100k words with startsWith on each keystroke", BRUTE],
      ["A hash set of complete words", "misconception:exact_vs_prefix"],
      ["A stack of recent searches", WRONG_PATTERN],
    ],
    explanation:
      "Tries share prefixes, so lookup cost depends on the prefix length, not the dictionary size.",
    approach:
      "1) Insert each word character by character, marking word ends. 2) For a query, follow the prefix's characters. 3) DFS from that node to list (or rank) completions.",
  },
  {
    id: "pat-fs-05",
    domains: ["fullstack"],
    skillId: "dsa-sorting-searching",
    pattern: "Sort + merge intervals",
    prompt:
      "A meeting-room calendar has booked slots [start, end). Show the merged busy periods. Which approach?",
    correct:
      "Sort by start time, then merge each slot into the previous one if they overlap (O(n log n))",
    wrong: [
      ["Compare every pair of slots (O(n²))", BRUTE],
      ["Sort by end time and count slots", WRONG_PATTERN],
      ["A hash map keyed by start time", null],
    ],
    explanation:
      "After sorting by start, overlapping slots are adjacent, so a single pass merges them.",
    approach:
      "1) Sort by start. 2) For each slot: if start ≤ last.end, last.end = max(last.end, end); else append the slot.",
  },
  {
    id: "pat-fs-06",
    domains: ["fullstack"],
    skillId: "dsa-sorting-searching",
    pattern: "Binary search (lower bound)",
    prompt:
      "Infinite scroll: in 1M posts sorted by time, find the first post newer than a given timestamp. Which approach?",
    correct: "Binary search for the lower bound on the sorted timestamps (O(log n))",
    wrong: [
      ["Scan from the oldest post (O(n))", BRUTE],
      ["A hash map from timestamp to post", "misconception:exact_vs_range"],
      ["Reverse the list first", null],
    ],
    explanation:
      "Hash maps answer exact matches only; 'first newer than' is a range question, which binary search answers.",
    approach:
      "lo = 0, hi = n. While lo < hi: mid = (lo + hi) // 2; if t[mid] ≤ T, lo = mid + 1, else hi = mid. Answer = lo.",
  },
  {
    id: "pat-fs-07",
    domains: ["fullstack"],
    skillId: "dsa-hashing",
    pattern: "Hash set (dedupe)",
    difficulty: 2,
    prompt:
      "Remove duplicate emails (case-insensitive) from a sign-up list, keeping the first occurrence and the original order. Which approach?",
    correct:
      "One pass with a hash set of lowercased emails; keep an email only if it's unseen (O(n))",
    wrong: [
      ["Sort, then drop adjacent duplicates", "misconception:loses_order"],
      ["Compare each email with every earlier one (O(n²))", BRUTE],
      ["Push emails onto a stack", WRONG_PATTERN],
    ],
    explanation:
      "A set gives O(1) average membership checks, and a single forward pass keeps the original order.",
    approach:
      "seen = set(). For each email e: key = e.lower(); if key not in seen: seen.add(key), output e.",
  },
  {
    id: "pat-fs-08",
    domains: ["fullstack"],
    skillId: "dsa-stacks-queues",
    pattern: "Stack (matching)",
    difficulty: 2,
    prompt: "Check that HTML tags are properly nested, e.g. <div><b></b></div>. Which approach?",
    correct: "A stack: push each opening tag; on a closing tag, pop and check that it matches",
    wrong: [
      [
        "Check that the number of opening and closing tags is equal",
        "misconception:balanced_assumption",
      ],
      ["A queue of tags, matched first-in, first-out", "misconception:lifo_vs_fifo"],
      ["Sort the tags by name", null],
    ],
    explanation:
      "Equal counts miss <b><i></b></i>. Nesting is last-opened, first-closed, which is exactly a stack.",
    approach:
      "1) For each tag: if opening, push. 2) If closing, the stack must be non-empty and the top must match; pop. 3) Valid if the stack is empty at the end.",
  },

  // ───────────── Data / ML ─────────────
  {
    id: "pat-dm-01",
    domains: ["data-ml"],
    skillId: "dsa-hashing",
    pattern: "Hash map + heap (top-k frequent)",
    prompt: "Find the 10 most frequent words in a large log file. Which approach?",
    correct:
      "Count with a hash map, then keep a size-10 min-heap over the counts (O(n + m log 10))",
    wrong: [
      ["Sort all words, count runs, then sort the counts", SLOWER],
      ["For each word, count it by scanning the whole file (O(n²))", BRUTE],
      ["Keep the first 10 distinct words seen", null],
    ],
    explanation: "Counting is linear; the small heap avoids sorting all m distinct words.",
    approach:
      "1) counts[word] += 1 over the file. 2) For each (word, c): push (c, word) to a min-heap; pop if size > 10. 3) The heap holds the top 10.",
  },
  {
    id: "pat-dm-02",
    domains: ["data-ml"],
    skillId: "dsa-two-pointers-window",
    pattern: "Sliding window (fixed size)",
    difficulty: 2,
    prompt:
      "Update the moving average of the last k sensor readings every time a new reading arrives. Which approach?",
    correct:
      "Keep a window queue and a running sum: add the new value, subtract the one leaving (O(1) per update)",
    wrong: [
      ["Recompute the sum of the last k values each time (O(k))", "misconception:recompute"],
      ["Rebuild the prefix sums on every update", SLOWER],
      ["Sort the window", null],
    ],
    explanation:
      "Only one value enters and one leaves, so the sum changes by exactly those two values.",
    approach:
      "1) Push x, sum += x. 2) If the window size > k: sum −= popped value. 3) Average = sum / window size.",
  },
  {
    id: "pat-dm-03",
    domains: ["data-ml"],
    skillId: "dsa-arrays-strings",
    pattern: "Prefix sums (2D)",
    prompt:
      "Answer many queries for the sum of pixel values inside a rectangle of an image. Which approach?",
    correct: "Precompute 2D prefix sums once; answer each query in O(1) with inclusion–exclusion",
    wrong: [
      ["Loop over the rectangle for each query", BRUTE],
      ["1D prefix sums per row only (O(rows) per query)", SLOWER],
      ["Sort each row", null],
    ],
    explanation: "One O(rows × cols) precomputation makes every query constant time.",
    approach:
      "P[i][j] = sum of the top-left i×j block. Sum(r1..r2, c1..c2) = P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1].",
  },
  {
    id: "pat-dm-04",
    domains: ["data-ml"],
    skillId: "dsa-sorting-searching",
    pattern: "Heap (k closest)",
    prompt:
      "Find the k points closest to a query point among n points (k ≪ n). Which approach is efficient?",
    correct: "A max-heap of size k keyed by distance (or quickselect), O(n log k)",
    wrong: [
      ["Sort all n points by distance (O(n log n))", SLOWER],
      ["Take the first k points", null],
      ["Binary search on the x-coordinate", WRONG_PATTERN],
    ],
    explanation:
      "The heap root is the farthest of the current best k, so any farther point is rejected in O(1).",
    approach:
      "1) For each point: push (−distance, point). 2) If size > k, pop the farthest. 3) The heap holds the k nearest. Use squared distance to avoid sqrt.",
  },
  {
    id: "pat-dm-05",
    domains: ["data-ml"],
    skillId: "dsa-dynamic-programming",
    pattern: "DP (edit distance)",
    difficulty: 4,
    prompt:
      "Fuzzy-match messy product names: measure the insert/delete/replace edits between two strings. Which approach?",
    correct:
      "DP table dp[i][j] = edit distance between the first i and first j characters (O(m·n))",
    wrong: [
      ["Count positions where the characters differ", "misconception:ignores_shifts"],
      ["Greedy: match the longest common prefix, then count the rest", GREEDY],
      ["Sort both strings and compare", null],
    ],
    explanation:
      "One inserted character shifts every later position, so position-by-position comparison fails.",
    approach:
      "dp[i][0] = i, dp[0][j] = j. dp[i][j] = dp[i−1][j−1] if the characters match, else 1 + min(dp[i−1][j], dp[i][j−1], dp[i−1][j−1]).",
  },
  {
    id: "pat-dm-06",
    domains: ["data-ml"],
    skillId: "dsa-arrays-strings",
    pattern: "Reservoir sampling",
    difficulty: 4,
    prompt:
      "Pick one record uniformly at random from a stream of unknown length, in one pass and O(1) memory. Which approach?",
    correct:
      "Reservoir sampling: replace the kept record with the i-th record with probability 1/i",
    wrong: [
      ["Load the whole stream into memory, then pick", "misconception:memory_blowup"],
      ["Keep each new record with probability 1/2", "misconception:not_uniform"],
      ["Always keep the first record", null],
    ],
    explanation: "Each record ends up kept with probability exactly 1/n, and memory stays O(1).",
    approach:
      "i = 0. For each record: i += 1; with probability 1/i set kept = record. Return kept.",
  },
  {
    id: "pat-dm-07",
    domains: ["data-ml"],
    skillId: "dsa-sorting-searching",
    pattern: "Binary search (bounds)",
    prompt:
      "In sorted event timestamps, count events between t1 and t2, for thousands of queries. Which approach?",
    correct:
      "Two binary searches per query: lower bound of t1 and upper bound of t2 (O(log n) each)",
    wrong: [
      ["Scan every event for each query", BRUTE],
      ["A hash set of timestamps", "misconception:exact_vs_range"],
      ["Sort the timestamps again for each query", null],
    ],
    explanation:
      "count = upper_bound(t2) − lower_bound(t1); both are binary searches on the sorted array.",
    approach: "lo = first index with t ≥ t1; hi = first index with t > t2; answer = hi − lo.",
  },
  {
    id: "pat-dm-08",
    domains: ["data-ml"],
    skillId: "dsa-graphs",
    pattern: "Union–Find (connected components)",
    prompt:
      "Group users into clusters, given pairs 'A is similar to B' (similarity is transitive). Which approach?",
    correct: "Union–Find (disjoint sets), or BFS/DFS, to find connected components",
    wrong: [
      [
        "Count each user's pairs and group users with equal counts",
        "misconception:degree_vs_connectivity",
      ],
      ["Sort the pairs by the first user", null],
      ["Dynamic programming over users", WRONG_PATTERN],
    ],
    explanation:
      "Transitive similarity means clusters are the connected components of the pair graph.",
    approach:
      "1) parent[x] = x. 2) For each pair: union(find(a), find(b)), with path compression. 3) Users with the same root form a cluster.",
  },

  // ───────────── Service company (TCS, Infosys, Wipro, Accenture) ─────────────
  {
    id: "pat-sv-01",
    domains: ["service"],
    skillId: "dsa-two-pointers-window",
    pattern: "Two pointers",
    difficulty: 2,
    prompt:
      "Check whether a sentence is a palindrome, ignoring spaces and case, using O(1) extra space. Which approach?",
    correct: "Two pointers from both ends, skipping non-letters and comparing lowercase characters",
    wrong: [
      ["Build the reversed string and compare", "misconception:space_constraint"],
      [
        "Check that every character appears an even number of times",
        "misconception:anagram_vs_palindrome",
      ],
      ["Sort the characters", null],
    ],
    explanation:
      "Reversing needs O(n) extra space; even counts only show that some arrangement could be a palindrome.",
    approach:
      "l = 0, r = n − 1. While l < r: skip non-letters on both sides; if lower(s[l]) != lower(s[r]) return false; l++, r--.",
  },
  {
    id: "pat-sv-02",
    domains: ["service"],
    skillId: "dsa-complexity",
    pattern: "Sieve of Eratosthenes",
    difficulty: 2,
    prompt: "Print all prime numbers up to 1,000,000. Which approach?",
    correct:
      "Sieve of Eratosthenes: cross out multiples of each prime starting from p² (O(n log log n))",
    wrong: [
      ["Trial-divide each number by every smaller number (O(n²))", BRUTE],
      ["Trial-divide each number up to its square root (O(n√n))", SLOWER],
      ["Treat every odd number as prime", "misconception:odd_means_prime"],
    ],
    explanation:
      "Each composite is crossed out by its prime factors only, which is far cheaper than testing numbers one by one.",
    approach:
      "isPrime[0..n] = true (0, 1 false). For p from 2 while p² ≤ n: if isPrime[p], mark p², p² + p, … false.",
  },
  {
    id: "pat-sv-03",
    domains: ["service"],
    skillId: "dsa-arrays-strings",
    pattern: "Reversal trick",
    prompt: "Rotate an array right by k positions in place, with O(1) extra space. Which approach?",
    correct:
      "Reverse the whole array, then reverse the first k elements and the remaining n − k (after k = k mod n)",
    wrong: [
      ["Shift everything right by one position, k times (O(n·k))", BRUTE],
      ["Copy into a new array at index (i + k) mod n", "misconception:space_constraint"],
      ["Sort the array", null],
    ],
    explanation:
      "Three reversals move every element exactly where it belongs: O(n) time, O(1) space.",
    approach:
      "k %= n; reverse(0, n−1); reverse(0, k−1); reverse(k, n−1). E.g. [1,2,3,4,5], k=2 → [5,4,3,2,1] → [4,5,1,2,3].",
  },
  {
    id: "pat-sv-04",
    domains: ["service"],
    skillId: "dsa-hashing",
    pattern: "Frequency count",
    difficulty: 2,
    prompt: "Find the first non-repeating character in a string. Which approach?",
    correct: "Count every character in one pass, then scan again for the first count of 1 (O(n))",
    wrong: [
      ["For each character, scan the whole string to count it (O(n²))", BRUTE],
      ["Sort the string, then look for a character that appears once", "misconception:loses_order"],
      ["Use a stack of characters", WRONG_PATTERN],
    ],
    explanation:
      "Sorting loses which character came first; two linear passes keep both counts and order.",
    approach:
      "1) counts[c] += 1 for each c. 2) Scan s again; return the first c with counts[c] == 1.",
  },
  {
    id: "pat-sv-05",
    domains: ["service"],
    skillId: "dsa-complexity",
    pattern: "Euclid's algorithm",
    difficulty: 2,
    prompt: "Compute the GCD of two very large numbers efficiently. Which approach?",
    correct: "Euclid's algorithm: gcd(a, b) = gcd(b, a mod b) until b = 0 (O(log min(a, b)))",
    wrong: [
      ["Try every number from min(a, b) down to 1", BRUTE],
      ["Prime-factorise both numbers by trial division", SLOWER],
      ["Take min(a, b)", "misconception:gcd_is_min"],
    ],
    explanation:
      "Each modulo step at least halves the numbers every two steps, so it takes O(log) iterations.",
    approach:
      "while b != 0: a, b = b, a % b. return a. E.g. gcd(48, 18): (18, 12) → (12, 6) → (6, 0) → 6.",
  },
  {
    id: "pat-sv-06",
    domains: ["service"],
    skillId: "dsa-arrays-strings",
    pattern: "Single-pass tracking",
    difficulty: 2,
    prompt: "Find the second largest distinct number in an array in a single pass. Which approach?",
    correct:
      "Track largest and second largest while scanning; on a new maximum, shift the old one down (O(n), O(1))",
    wrong: [
      ["Sort and take the second-to-last element", "misconception:duplicates_ignored"],
      ["Find the max, delete it, then find the max again", SLOWER],
      ["Use a hash map of counts", WRONG_PATTERN],
    ],
    explanation:
      "Sorting [5, 5, 3] and taking the second-to-last gives 5, not 3; you must skip values equal to the maximum.",
    approach:
      "first = second = −∞. For x: if x > first: second = first, first = x; elif first > x > second: second = x.",
  },
  {
    id: "pat-sv-07",
    domains: ["service"],
    skillId: "dsa-arrays-strings",
    pattern: "Boundary simulation",
    prompt: "Print an m × n matrix in spiral order. Which approach?",
    correct:
      "Keep top, bottom, left and right boundaries; walk each edge in turn and shrink that boundary",
    wrong: [
      ["Transpose the matrix, then print it row by row", WRONG_PATTERN],
      ["Sort all values and print them", null],
      ["Print each row, alternating direction (zig-zag)", "misconception:zigzag_vs_spiral"],
    ],
    explanation: "Four shrinking boundaries visit each cell exactly once: O(m·n).",
    approach:
      "While top ≤ bottom and left ≤ right: print the top row, top++; the right column, right--; the bottom row (if top ≤ bottom), bottom--; the left column (if left ≤ right), left++.",
  },
  {
    id: "pat-sv-08",
    domains: ["service"],
    skillId: "dsa-arrays-strings",
    pattern: "Math / XOR",
    difficulty: 2,
    prompt:
      "An array holds n − 1 distinct numbers from 1 to n. Find the missing one in O(n) time and O(1) extra space.",
    correct: "Subtract the array's sum from n(n + 1)/2 (or XOR 1..n with all elements)",
    wrong: [
      ["Sort, then scan for the gap (O(n log n))", SLOWER],
      ["For each number 1..n, search the array for it (O(n²))", BRUTE],
      ["Put everything in a hash set and check 1..n", "misconception:space_constraint"],
    ],
    explanation:
      "The expected total minus the actual total is exactly the missing number. XOR avoids overflow for huge n.",
    approach:
      "missing = n(n + 1)/2 − sum(a). XOR version: x = 0; XOR in 1..n and every element; x is the missing number.",
  },
];

export const codingPatterns: WithId<Question>[] = specs.map(pattern);
