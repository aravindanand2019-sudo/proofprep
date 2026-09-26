// Daily coding problems: well-known classics, restated in our own words, each linking to
// the original. Expected outputs are NOT typed by hand: every problem has a reference
// solution, and build() runs it on each test's arguments. References never leave the seed.
import type {
  CompareMode,
  Domain,
  PracticeProblem,
  ProblemPlatform,
  WithId,
} from "../../lib/schemas/index.ts";

type Args = unknown[];

type ProblemSpec = {
  id: string;
  title: string;
  platform: ProblemPlatform;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  skillId: string;
  pattern: string;
  domains: Domain[];
  statement: string;
  constraints: string[];
  fn: string;
  params: string[];
  compare?: CompareMode;
  examples: Array<{ args: Args; explanation?: string }>;
  hidden: Args[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- references take heterogeneous args
  reference: (...args: any[]) => unknown;
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function build(spec: ProblemSpec): WithId<PracticeProblem> {
  const run = (args: Args) => clone(spec.reference(...clone(args)));
  return {
    id: spec.id,
    title: spec.title,
    source: { platform: spec.platform, url: spec.url },
    difficulty: spec.difficulty,
    skillId: spec.skillId,
    pattern: spec.pattern,
    domains: spec.domains,
    statement: spec.statement,
    constraints: spec.constraints,
    fn: spec.fn,
    params: spec.params,
    compare: spec.compare ?? "exact",
    tests: [
      ...spec.examples.map((e) => ({
        args: e.args,
        expected: run(e.args),
        example: true,
        ...(e.explanation ? { explanation: e.explanation } : {}),
      })),
      ...spec.hidden.map((args) => ({ args, expected: run(args), example: false })),
    ],
    reviewed: false,
  };
}

const LC = (slug: string) => `https://leetcode.com/problems/${slug}/`;
const CF = (contest: number, index: string) =>
  `https://codeforces.com/problemset/problem/${contest}/${index}`;
const HR = (slug: string) => `https://www.hackerrank.com/challenges/${slug}/problem`;
const ALL: Domain[] = ["sde", "fullstack", "data-ml", "service"];

const specs: ProblemSpec[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    platform: "LeetCode",
    url: LC("two-sum"),
    difficulty: "Easy",
    skillId: "dsa-hashing",
    pattern: "Hash map",
    domains: ALL,
    statement:
      "Given an integer array nums and an integer target, return the indices of the two different elements that add up to target, in increasing order. Exactly one such pair exists.",
    constraints: ["2 ≤ nums.length ≤ 10⁴", "−10⁹ ≤ nums[i], target ≤ 10⁹", "Aim for O(n) time"],
    fn: "two_sum",
    params: ["nums", "target"],
    examples: [{ args: [[2, 7, 11, 15], 9], explanation: "2 + 7 = 9" }, { args: [[3, 2, 4], 6] }],
    hidden: [
      [[3, 3], 6],
      [[-1, -2, -3, -4, -5], -8],
      [[0, 4, 3, 0], 0],
      [[1, 5, 9, 14, 20], 34],
    ],
    reference: (nums: number[], target: number) => {
      const seen = new Map<number, number>();
      for (let i = 0; i < nums.length; i += 1) {
        const j = seen.get(target - (nums[i] ?? 0));
        if (j !== undefined) return [j, i];
        seen.set(nums[i] ?? 0, i);
      }
      return [];
    },
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    platform: "LeetCode",
    url: LC("valid-parentheses"),
    difficulty: "Easy",
    skillId: "dsa-stacks-queues",
    pattern: "Stack",
    domains: ["sde", "fullstack", "service"],
    statement:
      "A string contains only the characters ( ) [ ] { }. Return true if every opening bracket is closed by the same type of bracket in the correct order, otherwise false.",
    constraints: ["1 ≤ s.length ≤ 10⁴"],
    fn: "is_valid",
    params: ["s"],
    examples: [
      { args: ["()[]{}"] },
      { args: ["(]"] },
      { args: ["([)]"], explanation: "Closed in the wrong order" },
    ],
    hidden: [["{[]}"], ["(("], ["]"], ["(){}}{"], ["[({})]"]],
    reference: (s: string) => {
      const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
      const stack: string[] = [];
      for (const ch of s) {
        if (ch in pairs) {
          if (stack.pop() !== pairs[ch]) return false;
        } else stack.push(ch);
      }
      return stack.length === 0;
    },
  },
  {
    id: "best-time-stock",
    title: "Best Time to Buy and Sell Stock",
    platform: "LeetCode",
    url: LC("best-time-to-buy-and-sell-stock"),
    difficulty: "Easy",
    skillId: "dsa-arrays-strings",
    pattern: "Single pass (running minimum)",
    domains: ALL,
    statement:
      "prices[i] is a stock's price on day i. Choose one day to buy and a later day to sell. Return the maximum profit, or 0 if no profit is possible.",
    constraints: ["1 ≤ prices.length ≤ 10⁵", "0 ≤ prices[i] ≤ 10⁴"],
    fn: "max_profit",
    params: ["prices"],
    examples: [
      { args: [[7, 1, 5, 3, 6, 4]], explanation: "Buy at 1, sell at 6" },
      { args: [[7, 6, 4, 3, 1]], explanation: "Prices only fall" },
    ],
    hidden: [[[1]], [[2, 4, 1]], [[3, 3, 3]], [[1, 2, 3, 4, 5]], [[9, 2, 8, 1, 7]]],
    reference: (prices: number[]) => {
      let low = Infinity;
      let best = 0;
      for (const p of prices) {
        low = Math.min(low, p);
        best = Math.max(best, p - low);
      }
      return best;
    },
  },
  {
    id: "maximum-subarray",
    title: "Maximum Subarray",
    platform: "LeetCode",
    url: LC("maximum-subarray"),
    difficulty: "Medium",
    skillId: "dsa-dynamic-programming",
    pattern: "Kadane's algorithm",
    domains: ["sde", "data-ml", "service"],
    statement: "Return the largest sum of any non-empty contiguous subarray of nums.",
    constraints: ["1 ≤ nums.length ≤ 10⁵", "−10⁴ ≤ nums[i] ≤ 10⁴"],
    fn: "max_sub_array",
    params: ["nums"],
    examples: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], explanation: "[4, −1, 2, 1] sums to 6" },
      { args: [[1]] },
    ],
    hidden: [[[5, 4, -1, 7, 8]], [[-3, -1, -2]], [[0, 0, 0]], [[2, -1, 2, -1, 2]]],
    reference: (nums: number[]) => {
      let best = nums[0] ?? 0;
      let cur = 0;
      for (const n of nums) {
        cur = Math.max(n, cur + n);
        best = Math.max(best, cur);
      }
      return best;
    },
  },
  {
    id: "longest-substring-no-repeat",
    title: "Longest Substring Without Repeating Characters",
    platform: "LeetCode",
    url: LC("longest-substring-without-repeating-characters"),
    difficulty: "Medium",
    skillId: "dsa-two-pointers-window",
    pattern: "Sliding window",
    domains: ["sde", "fullstack"],
    statement:
      "Return the length of the longest substring of s that contains no repeated character.",
    constraints: ["0 ≤ s.length ≤ 5·10⁴"],
    fn: "length_of_longest_substring",
    params: ["s"],
    examples: [
      { args: ["abcabcbb"], explanation: '"abc"' },
      { args: ["bbbbb"] },
      { args: ["pwwkew"], explanation: '"wke"' },
    ],
    hidden: [[""], [" "], ["dvdf"], ["abba"], ["abcdefg"]],
    reference: (s: string) => {
      const last = new Map<string, number>();
      let left = 0;
      let best = 0;
      [...s].forEach((ch, i) => {
        const prev = last.get(ch);
        if (prev !== undefined && prev >= left) left = prev + 1;
        last.set(ch, i);
        best = Math.max(best, i - left + 1);
      });
      return best;
    },
  },
  {
    id: "container-most-water",
    title: "Container With Most Water",
    platform: "LeetCode",
    url: LC("container-with-most-water"),
    difficulty: "Medium",
    skillId: "dsa-two-pointers-window",
    pattern: "Two pointers",
    domains: ["sde"],
    statement:
      "height[i] is the height of a vertical line at x = i. Pick two lines that, with the x-axis, hold the most water. Return that amount: (distance between lines) × (shorter line).",
    constraints: ["2 ≤ height.length ≤ 10⁵", "0 ≤ height[i] ≤ 10⁴"],
    fn: "max_area",
    params: ["height"],
    examples: [
      { args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], explanation: "Lines at 1 and 8: 7 × 7 = 49" },
      { args: [[1, 1]] },
    ],
    hidden: [[[4, 3, 2, 1, 4]], [[1, 2, 1]], [[2, 3, 10, 5, 7, 8, 9]]],
    reference: (h: number[]) => {
      let l = 0;
      let r = h.length - 1;
      let best = 0;
      while (l < r) {
        const hl = h[l] ?? 0;
        const hr = h[r] ?? 0;
        best = Math.max(best, (r - l) * Math.min(hl, hr));
        if (hl < hr) l += 1;
        else r -= 1;
      }
      return best;
    },
  },
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    platform: "LeetCode",
    url: LC("merge-intervals"),
    difficulty: "Medium",
    skillId: "dsa-sorting-searching",
    pattern: "Sort + merge",
    domains: ["sde", "fullstack"],
    statement:
      "Given intervals [start, end], merge all overlapping ones (touching counts as overlapping) and return the result sorted by start.",
    constraints: ["1 ≤ intervals.length ≤ 10⁴"],
    fn: "merge",
    params: ["intervals"],
    examples: [
      {
        args: [
          [
            [1, 3],
            [2, 6],
            [8, 10],
            [15, 18],
          ],
        ],
      },
      {
        args: [
          [
            [1, 4],
            [4, 5],
          ],
        ],
      },
    ],
    hidden: [
      [
        [
          [1, 4],
          [0, 4],
        ],
      ],
      [
        [
          [1, 4],
          [2, 3],
        ],
      ],
      [[[5, 6]]],
      [
        [
          [6, 8],
          [1, 9],
          [2, 4],
          [4, 7],
        ],
      ],
    ],
    reference: (intervals: number[][]) => {
      const sorted = [...intervals].sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
      const out: number[][] = [];
      for (const [s, e] of sorted as Array<[number, number]>) {
        const last = out[out.length - 1];
        if (last && s <= (last[1] ?? 0)) last[1] = Math.max(last[1] ?? 0, e);
        else out.push([s, e]);
      }
      return out;
    },
  },
  {
    id: "top-k-frequent",
    title: "Top K Frequent Elements",
    platform: "LeetCode",
    url: LC("top-k-frequent-elements"),
    difficulty: "Medium",
    skillId: "dsa-hashing",
    pattern: "Hash map + heap / bucket sort",
    domains: ["data-ml", "sde"],
    compare: "sorted",
    statement:
      "Return the k most frequent elements of nums, in any order. The answer is guaranteed to be unique.",
    constraints: ["1 ≤ nums.length ≤ 10⁵", "k is in the range [1, number of distinct elements]"],
    fn: "top_k_frequent",
    params: ["nums", "k"],
    examples: [{ args: [[1, 1, 1, 2, 2, 3], 2] }, { args: [[1], 1] }],
    hidden: [
      [[4, 4, 4, 5, 5, 6, 6, 6, 6], 1],
      [[1, 2, 2, 3, 3, 3], 3],
      [[-1, -1, 7, 7, 7, 2], 2],
    ],
    reference: (nums: number[], k: number) => {
      const counts = new Map<number, number>();
      for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, k)
        .map(([n]) => n);
    },
  },
  {
    id: "product-except-self",
    title: "Product of Array Except Self",
    platform: "LeetCode",
    url: LC("product-of-array-except-self"),
    difficulty: "Medium",
    skillId: "dsa-arrays-strings",
    pattern: "Prefix & suffix products",
    domains: ["sde", "data-ml"],
    statement:
      "Return an array answer where answer[i] is the product of all elements of nums except nums[i]. Do it in O(n) without using division.",
    constraints: ["2 ≤ nums.length ≤ 10⁵", "Products fit in a 32-bit integer"],
    fn: "product_except_self",
    params: ["nums"],
    examples: [{ args: [[1, 2, 3, 4]] }, { args: [[-1, 1, 0, -3, 3]] }],
    hidden: [[[2, 3]], [[0, 0, 5]], [[5, 1, 2, 1]]],
    reference: (nums: number[]) =>
      nums
        .map((_, i) => nums.reduce((p, n, j) => (j === i ? p : p * n), 1))
        .map((v) => (v === 0 ? 0 : v)),
  },
  {
    id: "climbing-stairs",
    title: "Climbing Stairs",
    platform: "LeetCode",
    url: LC("climbing-stairs"),
    difficulty: "Easy",
    skillId: "dsa-dynamic-programming",
    pattern: "Dynamic programming",
    domains: ["service", "sde"],
    statement:
      "You climb n stairs, taking 1 or 2 steps at a time. In how many distinct ways can you reach the top?",
    constraints: ["1 ≤ n ≤ 45"],
    fn: "climb_stairs",
    params: ["n"],
    examples: [{ args: [2], explanation: "1+1 or 2" }, { args: [3] }],
    hidden: [[1], [5], [10], [45]],
    reference: (n: number) => {
      let a = 1;
      let b = 1;
      for (let i = 2; i <= n; i += 1) [a, b] = [b, a + b];
      return b;
    },
  },
  {
    id: "coin-change",
    title: "Coin Change",
    platform: "LeetCode",
    url: LC("coin-change"),
    difficulty: "Medium",
    skillId: "dsa-dynamic-programming",
    pattern: "Dynamic programming (unbounded knapsack)",
    domains: ["sde", "data-ml"],
    statement:
      "Given coin denominations (unlimited supply of each) and an amount, return the fewest coins that make up the amount, or −1 if it can't be made.",
    constraints: ["1 ≤ coins.length ≤ 12", "0 ≤ amount ≤ 10⁴"],
    fn: "coin_change",
    params: ["coins", "amount"],
    examples: [{ args: [[1, 2, 5], 11], explanation: "5 + 5 + 1" }, { args: [[2], 3] }],
    hidden: [
      [[1], 0],
      [[2, 5, 10, 1], 27],
      [[186, 419, 83, 408], 6249],
      [[3, 7], 5],
    ],
    reference: (coins: number[], amount: number) => {
      const dp = Array<number>(amount + 1).fill(Infinity);
      dp[0] = 0;
      for (let a = 1; a <= amount; a += 1) {
        for (const c of coins)
          if (c <= a) dp[a] = Math.min(dp[a] ?? Infinity, (dp[a - c] ?? Infinity) + 1);
      }
      const r = dp[amount] ?? Infinity;
      return r === Infinity ? -1 : r;
    },
  },
  {
    id: "number-of-islands",
    title: "Number of Islands",
    platform: "LeetCode",
    url: LC("number-of-islands"),
    difficulty: "Medium",
    skillId: "dsa-graphs",
    pattern: "Grid BFS / DFS",
    domains: ["sde", "data-ml"],
    statement:
      'grid is a 2D map of "1" (land) and "0" (water). An island is land connected horizontally or vertically. Return the number of islands.',
    constraints: ["1 ≤ rows, cols ≤ 300"],
    fn: "num_islands",
    params: ["grid"],
    examples: [
      {
        args: [
          [
            ["1", "1", "0", "0"],
            ["1", "1", "0", "0"],
            ["0", "0", "1", "0"],
            ["0", "0", "0", "1"],
          ],
        ],
      },
      {
        args: [
          [
            ["1", "1", "1"],
            ["0", "1", "0"],
            ["1", "1", "1"],
          ],
        ],
      },
    ],
    hidden: [
      [[["0"]]],
      [[["1", "0", "1", "0", "1"]]],
      [
        [
          ["1", "1"],
          ["1", "1"],
        ],
      ],
      [
        [
          ["1", "0"],
          ["0", "1"],
        ],
      ],
    ],
    reference: (grid: string[][]) => {
      const g = grid.map((r) => [...r]);
      let count = 0;
      const sink = (i: number, j: number) => {
        if (g[i]?.[j] !== "1") return;
        (g[i] as string[])[j] = "0";
        sink(i + 1, j);
        sink(i - 1, j);
        sink(i, j + 1);
        sink(i, j - 1);
      };
      g.forEach((row, i) =>
        row.forEach((cell, j) => {
          if (cell === "1") {
            count += 1;
            sink(i, j);
          }
        }),
      );
      return count;
    },
  },
  {
    id: "binary-search",
    title: "Binary Search",
    platform: "LeetCode",
    url: LC("binary-search"),
    difficulty: "Easy",
    skillId: "dsa-sorting-searching",
    pattern: "Binary search",
    domains: ["service", "fullstack", "sde"],
    statement:
      "nums is sorted in ascending order with distinct values. Return the index of target, or −1 if absent. Use O(log n) time.",
    constraints: ["1 ≤ nums.length ≤ 10⁴"],
    fn: "search",
    params: ["nums", "target"],
    examples: [{ args: [[-1, 0, 3, 5, 9, 12], 9] }, { args: [[-1, 0, 3, 5, 9, 12], 2] }],
    hidden: [
      [[5], 5],
      [[5], 1],
      [[1, 3], 3],
      [[2, 4, 6, 8, 10, 12, 14], 2],
    ],
    reference: (nums: number[], target: number) => nums.indexOf(target),
  },
  {
    id: "search-rotated",
    title: "Search in Rotated Sorted Array",
    platform: "LeetCode",
    url: LC("search-in-rotated-sorted-array"),
    difficulty: "Medium",
    skillId: "dsa-sorting-searching",
    pattern: "Modified binary search",
    domains: ["sde"],
    statement:
      "A sorted array of distinct integers was rotated at an unknown pivot (e.g. [0,1,2,4,5,6,7] → [4,5,6,7,0,1,2]). Return the index of target or −1, in O(log n).",
    constraints: ["1 ≤ nums.length ≤ 5000"],
    fn: "search_rotated",
    params: ["nums", "target"],
    examples: [{ args: [[4, 5, 6, 7, 0, 1, 2], 0] }, { args: [[4, 5, 6, 7, 0, 1, 2], 3] }],
    hidden: [
      [[1], 0],
      [[3, 1], 1],
      [[5, 1, 3], 5],
      [[6, 7, 1, 2, 3, 4, 5], 6],
    ],
    reference: (nums: number[], target: number) => nums.indexOf(target),
  },
  {
    id: "daily-temperatures",
    title: "Daily Temperatures",
    platform: "LeetCode",
    url: LC("daily-temperatures"),
    difficulty: "Medium",
    skillId: "dsa-stacks-queues",
    pattern: "Monotonic stack",
    domains: ["sde", "data-ml"],
    statement:
      "For each day, return how many days you must wait for a warmer temperature. Use 0 if there is no warmer future day.",
    constraints: ["1 ≤ temperatures.length ≤ 10⁵"],
    fn: "daily_temperatures",
    params: ["temperatures"],
    examples: [{ args: [[73, 74, 75, 71, 69, 72, 76, 73]] }, { args: [[30, 40, 50, 60]] }],
    hidden: [[[30, 60, 90]], [[90, 80, 70]], [[50, 50, 51]]],
    reference: (t: number[]) => {
      const ans = Array<number>(t.length).fill(0);
      const stack: number[] = [];
      t.forEach((v, i) => {
        while (stack.length && (t[stack[stack.length - 1] ?? 0] ?? 0) < v) {
          const j = stack.pop() ?? 0;
          ans[j] = i - j;
        }
        stack.push(i);
      });
      return ans;
    },
  },
  {
    id: "group-anagrams",
    title: "Group Anagrams",
    platform: "LeetCode",
    url: LC("group-anagrams"),
    difficulty: "Medium",
    skillId: "dsa-hashing",
    pattern: "Hash map with a canonical key",
    domains: ["fullstack", "sde"],
    compare: "deep-sorted",
    statement: "Group the words that are anagrams of each other. Return the groups in any order.",
    constraints: ["1 ≤ strs.length ≤ 10⁴", "Lowercase letters only"],
    fn: "group_anagrams",
    params: ["strs"],
    examples: [{ args: [["eat", "tea", "tan", "ate", "nat", "bat"]] }, { args: [[""]] }],
    hidden: [[["a"]], [["abc", "bca", "cab", "xyz"]], [["ab", "ba", "ab"]]],
    reference: (strs: string[]) => {
      const groups = new Map<string, string[]>();
      for (const s of strs) {
        const key = [...s].sort().join("");
        groups.set(key, [...(groups.get(key) ?? []), s]);
      }
      return [...groups.values()];
    },
  },
  {
    id: "course-schedule",
    title: "Course Schedule",
    platform: "LeetCode",
    url: LC("course-schedule"),
    difficulty: "Medium",
    skillId: "dsa-graphs",
    pattern: "Topological sort / cycle detection",
    domains: ["fullstack", "sde"],
    statement:
      "There are num_courses courses (0 … n−1). Each pair [a, b] means you must take b before a. Return true if you can finish all courses (the prerequisites have no cycle).",
    constraints: ["1 ≤ num_courses ≤ 2000", "0 ≤ prerequisites.length ≤ 5000"],
    fn: "can_finish",
    params: ["num_courses", "prerequisites"],
    examples: [
      { args: [2, [[1, 0]]] },
      {
        args: [
          2,
          [
            [1, 0],
            [0, 1],
          ],
        ],
        explanation: "A cycle",
      },
    ],
    hidden: [
      [1, []],
      [
        3,
        [
          [1, 0],
          [2, 1],
        ],
      ],
      [
        4,
        [
          [1, 0],
          [2, 1],
          [3, 2],
          [1, 3],
        ],
      ],
      [
        5,
        [
          [1, 4],
          [2, 4],
          [3, 1],
          [3, 2],
        ],
      ],
    ],
    reference: (n: number, pre: number[][]) => {
      const indeg = Array<number>(n).fill(0);
      const adj: number[][] = Array.from({ length: n }, () => []);
      for (const [a, b] of pre as Array<[number, number]>) {
        adj[b]?.push(a);
        indeg[a] = (indeg[a] ?? 0) + 1;
      }
      const queue = indeg.flatMap((d, i) => (d === 0 ? [i] : []));
      let done = 0;
      while (queue.length) {
        const c = queue.shift() ?? 0;
        done += 1;
        for (const nx of adj[c] ?? []) {
          indeg[nx] = (indeg[nx] ?? 0) - 1;
          if (indeg[nx] === 0) queue.push(nx);
        }
      }
      return done === n;
    },
  },
  {
    id: "longest-increasing-subsequence",
    title: "Longest Increasing Subsequence",
    platform: "LeetCode",
    url: LC("longest-increasing-subsequence"),
    difficulty: "Medium",
    skillId: "dsa-dynamic-programming",
    pattern: "DP + binary search",
    domains: ["sde", "data-ml"],
    statement: "Return the length of the longest strictly increasing subsequence of nums.",
    constraints: ["1 ≤ nums.length ≤ 2500"],
    fn: "length_of_lis",
    params: ["nums"],
    examples: [
      { args: [[10, 9, 2, 5, 3, 7, 101, 18]], explanation: "[2, 3, 7, 101]" },
      { args: [[7, 7, 7, 7]] },
    ],
    hidden: [[[0, 1, 0, 3, 2, 3]], [[5]], [[3, 10, 2, 3, 4]], [[1, 2, 3, 4, 5, 6]]],
    reference: (nums: number[]) => {
      const tails: number[] = [];
      for (const x of nums) {
        let lo = 0;
        let hi = tails.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if ((tails[mid] ?? 0) < x) lo = mid + 1;
          else hi = mid;
        }
        tails[lo] = x;
      }
      return tails.length;
    },
  },
  {
    id: "edit-distance",
    title: "Edit Distance",
    platform: "LeetCode",
    url: LC("edit-distance"),
    difficulty: "Medium",
    skillId: "dsa-dynamic-programming",
    pattern: "2D dynamic programming",
    domains: ["data-ml"],
    statement:
      "Return the minimum number of single-character inserts, deletes or replacements needed to turn word1 into word2.",
    constraints: ["0 ≤ word1.length, word2.length ≤ 500"],
    fn: "min_distance",
    params: ["word1", "word2"],
    examples: [{ args: ["horse", "ros"] }, { args: ["intention", "execution"] }],
    hidden: [
      ["", "abc"],
      ["same", "same"],
      ["kitten", "sitting"],
      ["a", ""],
    ],
    reference: (a: string, b: string) => {
      let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
      for (let i = 1; i <= a.length; i += 1) {
        const cur = [i];
        for (let j = 1; j <= b.length; j += 1) {
          cur[j] =
            a[i - 1] === b[j - 1]
              ? (prev[j - 1] ?? 0)
              : 1 + Math.min(prev[j] ?? 0, cur[j - 1] ?? 0, prev[j - 1] ?? 0);
        }
        prev = cur;
      }
      return prev[b.length] ?? 0;
    },
  },
  {
    id: "kth-largest",
    title: "Kth Largest Element in an Array",
    platform: "LeetCode",
    url: LC("kth-largest-element-in-an-array"),
    difficulty: "Medium",
    skillId: "dsa-sorting-searching",
    pattern: "Heap / quickselect",
    domains: ["data-ml", "sde"],
    statement:
      "Return the kth largest element of nums (in sorted order, not the kth distinct). Try to beat O(n log n).",
    constraints: ["1 ≤ k ≤ nums.length ≤ 10⁵"],
    fn: "find_kth_largest",
    params: ["nums", "k"],
    examples: [{ args: [[3, 2, 1, 5, 6, 4], 2] }, { args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4] }],
    hidden: [
      [[1], 1],
      [[7, 7, 7], 2],
      [[-1, 2, 0], 3],
    ],
    reference: (nums: number[], k: number) => [...nums].sort((a, b) => b - a)[k - 1],
  },
  {
    id: "majority-element",
    title: "Majority Element",
    platform: "LeetCode",
    url: LC("majority-element"),
    difficulty: "Easy",
    skillId: "dsa-arrays-strings",
    pattern: "Boyer–Moore voting",
    domains: ["service", "data-ml"],
    statement:
      "Return the element that appears more than n/2 times in nums. It always exists. Can you use O(1) extra space?",
    constraints: ["1 ≤ nums.length ≤ 5·10⁴"],
    fn: "majority_element",
    params: ["nums"],
    examples: [{ args: [[3, 2, 3]] }, { args: [[2, 2, 1, 1, 1, 2, 2]] }],
    hidden: [[[1]], [[6, 5, 5]], [[4, 4, 4, 1, 2]]],
    reference: (nums: number[]) => {
      let cand = 0;
      let count = 0;
      for (const n of nums) {
        if (count === 0) cand = n;
        count += n === cand ? 1 : -1;
      }
      return cand;
    },
  },
  {
    id: "valid-anagram",
    title: "Valid Anagram",
    platform: "LeetCode",
    url: LC("valid-anagram"),
    difficulty: "Easy",
    skillId: "dsa-hashing",
    pattern: "Frequency count",
    domains: ["service", "fullstack"],
    statement: "Return true if t is an anagram of s (same letters, same counts), otherwise false.",
    constraints: ["1 ≤ s.length, t.length ≤ 5·10⁴", "Lowercase letters"],
    fn: "is_anagram",
    params: ["s", "t"],
    examples: [{ args: ["anagram", "nagaram"] }, { args: ["rat", "car"] }],
    hidden: [
      ["a", "ab"],
      ["listen", "silent"],
      ["aacc", "ccac"],
    ],
    reference: (s: string, t: string) => [...s].sort().join("") === [...t].sort().join(""),
  },
  {
    id: "move-zeroes",
    title: "Move Zeroes",
    platform: "LeetCode",
    url: LC("move-zeroes"),
    difficulty: "Easy",
    skillId: "dsa-two-pointers-window",
    pattern: "Two pointers",
    domains: ["service"],
    statement:
      "Move all 0s to the end of nums while keeping the relative order of the other elements, and return the array. (The original modifies it in place; here, return it.)",
    constraints: ["1 ≤ nums.length ≤ 10⁴"],
    fn: "move_zeroes",
    params: ["nums"],
    examples: [{ args: [[0, 1, 0, 3, 12]] }, { args: [[0]] }],
    hidden: [[[1, 2, 3]], [[0, 0, 1]], [[4, 0, 5, 0, 0, 6]]],
    reference: (nums: number[]) => [...nums.filter((n) => n !== 0), ...nums.filter((n) => n === 0)],
  },
  {
    id: "subarray-sum-k",
    title: "Subarray Sum Equals K",
    platform: "LeetCode",
    url: LC("subarray-sum-equals-k"),
    difficulty: "Medium",
    skillId: "dsa-hashing",
    pattern: "Prefix sum + hash map",
    domains: ["data-ml", "sde"],
    statement: "Return the number of contiguous subarrays of nums whose sum equals k.",
    constraints: ["1 ≤ nums.length ≤ 2·10⁴", "Values can be negative"],
    fn: "subarray_sum",
    params: ["nums", "k"],
    examples: [{ args: [[1, 1, 1], 2] }, { args: [[1, 2, 3], 3] }],
    hidden: [
      [[1], 0],
      [[1, -1, 0], 0],
      [[3, 4, 7, 2, -3, 1, 4, 2], 7],
    ],
    reference: (nums: number[], k: number) => {
      const seen = new Map<number, number>([[0, 1]]);
      let sum = 0;
      let count = 0;
      for (const n of nums) {
        sum += n;
        count += seen.get(sum - k) ?? 0;
        seen.set(sum, (seen.get(sum) ?? 0) + 1);
      }
      return count;
    },
  },
  {
    id: "generate-parentheses",
    title: "Generate Parentheses",
    platform: "LeetCode",
    url: LC("generate-parentheses"),
    difficulty: "Medium",
    skillId: "dsa-recursion-backtracking",
    pattern: "Backtracking",
    domains: ["sde"],
    compare: "sorted",
    statement: "Return all combinations of n pairs of well-formed parentheses, in any order.",
    constraints: ["1 ≤ n ≤ 8"],
    fn: "generate_parenthesis",
    params: ["n"],
    examples: [{ args: [3] }, { args: [1] }],
    hidden: [[2], [4]],
    reference: (n: number) => {
      const out: string[] = [];
      const go = (s: string, open: number, close: number) => {
        if (s.length === 2 * n) {
          out.push(s);
          return;
        }
        if (open < n) go(`${s}(`, open + 1, close);
        if (close < open) go(`${s})`, open, close + 1);
      };
      go("", 0, 0);
      return out;
    },
  },
  {
    id: "rotate-array",
    title: "Rotate Array",
    platform: "LeetCode",
    url: LC("rotate-array"),
    difficulty: "Medium",
    skillId: "dsa-arrays-strings",
    pattern: "Reversal trick",
    domains: ["service"],
    statement:
      "Rotate nums to the right by k steps and return it. Can you do it in place with O(1) extra space?",
    constraints: ["1 ≤ nums.length ≤ 10⁵", "0 ≤ k ≤ 10⁵"],
    fn: "rotate",
    params: ["nums", "k"],
    examples: [{ args: [[1, 2, 3, 4, 5, 6, 7], 3] }, { args: [[-1, -100, 3, 99], 2] }],
    hidden: [
      [[1, 2], 3],
      [[1], 0],
      [[1, 2, 3], 3],
    ],
    reference: (nums: number[], k: number) => {
      const n = nums.length;
      const r = k % n;
      return [...nums.slice(n - r), ...nums.slice(0, n - r)];
    },
  },
  {
    id: "missing-number",
    title: "Missing Number",
    platform: "LeetCode",
    url: LC("missing-number"),
    difficulty: "Easy",
    skillId: "dsa-arrays-strings",
    pattern: "Math / XOR",
    domains: ["service", "sde"],
    statement:
      "nums holds n distinct numbers from the range [0, n]. Return the one number in the range that is missing.",
    constraints: ["1 ≤ n ≤ 10⁴"],
    fn: "missing_number",
    params: ["nums"],
    examples: [{ args: [[3, 0, 1]] }, { args: [[9, 6, 4, 2, 3, 5, 7, 0, 1]] }],
    hidden: [[[0]], [[1]], [[0, 1]], [[1, 2, 3]]],
    reference: (nums: number[]) =>
      (nums.length * (nums.length + 1)) / 2 - nums.reduce((a, b) => a + b, 0),
  },
  {
    id: "spiral-matrix",
    title: "Spiral Matrix",
    platform: "LeetCode",
    url: LC("spiral-matrix"),
    difficulty: "Medium",
    skillId: "dsa-arrays-strings",
    pattern: "Boundary simulation",
    domains: ["service"],
    statement:
      "Return all elements of an m × n matrix in clockwise spiral order, starting at the top-left.",
    constraints: ["1 ≤ m, n ≤ 10"],
    fn: "spiral_order",
    params: ["matrix"],
    examples: [
      {
        args: [
          [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
        ],
      },
      {
        args: [
          [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
          ],
        ],
      },
    ],
    hidden: [
      [[[1]]],
      [
        [
          [1, 2],
          [3, 4],
        ],
      ],
      [[[1], [2], [3]]],
      [[[1, 2, 3]]],
    ],
    reference: (m: number[][]) => {
      const out: number[] = [];
      let top = 0;
      let bottom = m.length - 1;
      let left = 0;
      let right = (m[0]?.length ?? 0) - 1;
      const at = (i: number, j: number) => m[i]?.[j] ?? 0;
      while (top <= bottom && left <= right) {
        for (let j = left; j <= right; j += 1) out.push(at(top, j));
        top += 1;
        for (let i = top; i <= bottom; i += 1) out.push(at(i, right));
        right -= 1;
        if (top <= bottom) {
          for (let j = right; j >= left; j -= 1) out.push(at(bottom, j));
          bottom -= 1;
        }
        if (left <= right) {
          for (let i = bottom; i >= top; i -= 1) out.push(at(i, left));
          left += 1;
        }
      }
      return out;
    },
  },
  {
    id: "longest-common-prefix",
    title: "Longest Common Prefix",
    platform: "LeetCode",
    url: LC("longest-common-prefix"),
    difficulty: "Easy",
    skillId: "dsa-arrays-strings",
    pattern: "Vertical scanning",
    domains: ["service", "fullstack"],
    statement: 'Return the longest prefix shared by every string in strs, or "" if there is none.',
    constraints: ["1 ≤ strs.length ≤ 200"],
    fn: "longest_common_prefix",
    params: ["strs"],
    examples: [{ args: [["flower", "flow", "flight"]] }, { args: [["dog", "racecar", "car"]] }],
    hidden: [[["a"]], [["", "b"]], [["interview", "internet", "interval"]]],
    reference: (strs: string[]) => {
      let prefix = strs[0] ?? "";
      for (const s of strs) while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
      return prefix;
    },
  },
  {
    id: "cf-watermelon",
    title: "Watermelon",
    platform: "Codeforces",
    url: CF(4, "A"),
    difficulty: "Easy",
    skillId: "dsa-complexity",
    pattern: "Math / parity",
    domains: ["service"],
    statement:
      'Two friends want to split a watermelon of weight w kilos into two parts, each weighing a positive even number of kilos. Return "YES" if possible, otherwise "NO".',
    constraints: ["1 ≤ w ≤ 100"],
    fn: "can_split",
    params: ["w"],
    examples: [
      { args: [8], explanation: "2 + 6 or 4 + 4" },
      { args: [2], explanation: "Parts would be 1 + 1" },
    ],
    hidden: [[1], [4], [7], [100]],
    reference: (w: number) => (w > 2 && w % 2 === 0 ? "YES" : "NO"),
  },
  {
    id: "cf-way-too-long-words",
    title: "Way Too Long Words",
    platform: "Codeforces",
    url: CF(71, "A"),
    difficulty: "Easy",
    skillId: "dsa-arrays-strings",
    pattern: "String manipulation",
    domains: ["service"],
    statement:
      'Words longer than 10 characters are abbreviated as: first letter + number of letters in between + last letter (e.g. "localization" → "l10n"). Shorter words stay unchanged. Return the result for one word.',
    constraints: ["1 ≤ word.length ≤ 100"],
    fn: "abbreviate",
    params: ["word"],
    examples: [{ args: ["localization"] }, { args: ["word"] }],
    hidden: [["internationalization"], ["abcdefghij"], ["abcdefghijk"]],
    reference: (w: string) => (w.length > 10 ? `${w[0]}${w.length - 2}${w[w.length - 1]}` : w),
  },
  {
    id: "cf-taxi",
    title: "Taxi",
    platform: "Codeforces",
    url: CF(158, "B"),
    difficulty: "Medium",
    skillId: "dsa-sorting-searching",
    pattern: "Greedy counting",
    domains: ["sde", "service"],
    statement:
      "groups[i] (1–4) is the size of a group of friends. Each taxi carries at most 4 people and a group must ride together. Return the minimum number of taxis.",
    constraints: ["1 ≤ groups.length ≤ 10⁵", "1 ≤ groups[i] ≤ 4"],
    fn: "min_taxis",
    params: ["groups"],
    examples: [{ args: [[1, 2, 4, 3, 3]] }, { args: [[2, 3, 4, 4, 2, 1, 3, 1]] }],
    hidden: [[[1]], [[1, 1, 1, 1, 1]], [[2, 2, 2]], [[3, 3, 1, 1, 2]]],
    reference: (groups: number[]) => {
      const c = [0, 0, 0, 0, 0];
      for (const g of groups) c[g] = (c[g] ?? 0) + 1;
      let taxis = (c[4] ?? 0) + (c[3] ?? 0);
      let ones = Math.max(0, (c[1] ?? 0) - (c[3] ?? 0));
      taxis += Math.floor((c[2] ?? 0) / 2);
      if ((c[2] ?? 0) % 2 === 1) {
        taxis += 1;
        ones = Math.max(0, ones - 2);
      }
      return taxis + Math.ceil(ones / 4);
    },
  },
  {
    id: "hr-diagonal-difference",
    title: "Diagonal Difference",
    platform: "HackerRank",
    url: HR("diagonal-difference"),
    difficulty: "Easy",
    skillId: "dsa-arrays-strings",
    pattern: "Matrix traversal",
    domains: ["service"],
    statement:
      "Given a square matrix, return the absolute difference between the sums of its two diagonals.",
    constraints: ["1 ≤ n ≤ 100"],
    fn: "diagonal_difference",
    params: ["arr"],
    examples: [
      {
        args: [
          [
            [11, 2, 4],
            [4, 5, 6],
            [10, 8, -12],
          ],
        ],
        explanation: "|4 − 19| = 15",
      },
      {
        args: [
          [
            [1, 2],
            [3, 4],
          ],
        ],
      },
    ],
    hidden: [
      [[[5]]],
      [
        [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
      ],
      [
        [
          [-1, 2],
          [3, -4],
        ],
      ],
    ],
    reference: (a: number[][]) =>
      Math.abs(a.reduce((s, row, i) => s + (row[i] ?? 0) - (row[row.length - 1 - i] ?? 0), 0)),
  },
  {
    id: "hr-sales-by-match",
    title: "Sales by Match",
    platform: "HackerRank",
    url: HR("sock-merchant"),
    difficulty: "Easy",
    skillId: "dsa-hashing",
    pattern: "Frequency count",
    domains: ["service", "fullstack"],
    statement:
      "ar[i] is the colour of the ith sock. Return how many matching pairs (same colour) can be made.",
    constraints: ["1 ≤ n ≤ 100"],
    fn: "sock_merchant",
    params: ["ar"],
    examples: [{ args: [[10, 20, 20, 10, 10, 30, 50, 10, 20]] }, { args: [[1, 2, 1, 2, 1, 3, 2]] }],
    hidden: [[[1]], [[4, 4, 4, 4]], [[1, 2, 3]]],
    reference: (ar: number[]) => {
      const c = new Map<number, number>();
      for (const x of ar) c.set(x, (c.get(x) ?? 0) + 1);
      return [...c.values()].reduce((s, n) => s + Math.floor(n / 2), 0);
    },
  },
  {
    id: "hr-mini-max-sum",
    title: "Mini-Max Sum",
    platform: "HackerRank",
    url: HR("mini-max-sum"),
    difficulty: "Easy",
    skillId: "dsa-arrays-strings",
    pattern: "Single pass (sum, min, max)",
    domains: ["service"],
    statement:
      "Given exactly five positive integers, return [minimum, maximum] of the sums you get by adding exactly four of them.",
    constraints: ["1 ≤ arr[i] ≤ 10⁹"],
    fn: "mini_max_sum",
    params: ["arr"],
    examples: [
      { args: [[1, 2, 3, 4, 5]], explanation: "10 = 1+2+3+4, 14 = 2+3+4+5" },
      { args: [[7, 69, 2, 221, 8974]] },
    ],
    hidden: [[[5, 5, 5, 5, 5]], [[1000000000, 1, 1, 1, 1]], [[3, 1, 4, 1, 5]]],
    reference: (arr: number[]) => {
      const total = arr.reduce((a, b) => a + b, 0);
      return [total - Math.max(...arr), total - Math.min(...arr)];
    },
  },
];

export const practiceProblems: WithId<PracticeProblem>[] = specs.map(build);
