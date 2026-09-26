// Mock interview round 2. Examples were checked by hand.
import type { CodingProblem, WithId } from "../../lib/schemas/index.ts";

export const codingProblems: WithId<CodingProblem>[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    skillId: "dsa-hashing",
    difficulty: 2,
    statement:
      "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. Each input has exactly one solution, and you may not use the same element twice. Return the indices in increasing order.",
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "−10⁹ ≤ nums[i], target ≤ 10⁹",
      "Exactly one valid answer exists",
      "Aim for better than O(n²) time",
    ],
    examples: [
      { input: "nums = [2, 7, 11, 15], target = 9", output: "[0, 1]", explanation: "2 + 7 = 9" },
      { input: "nums = [3, 2, 4], target = 6", output: "[1, 2]", explanation: "2 + 4 = 6" },
      { input: "nums = [3, 3], target = 6", output: "[0, 1]" },
    ],
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    skillId: "dsa-stacks-queues",
    difficulty: 2,
    statement:
      "Given a string s containing only the characters '(', ')', '{', '}', '[' and ']', return true if it is valid. A string is valid if every open bracket is closed by the same type of bracket, and brackets close in the correct order.",
    constraints: ["1 ≤ s.length ≤ 10⁴", "s contains only ()[]{}"],
    examples: [
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false", explanation: "'(' is closed by ']'" },
      { input: 's = "([)]"', output: "false", explanation: "Brackets close in the wrong order" },
      { input: 's = "{[]}"', output: "true" },
    ],
  },
];
