import { describe, expect, it } from "vitest";
import { camelCase, outputsMatch, starterCode } from "./compare.ts";

describe("outputsMatch", () => {
  it("exact compares JSON", () => {
    expect(outputsMatch([0, 1], [0, 1], "exact")).toBe(true);
    expect(outputsMatch([1, 0], [0, 1], "exact")).toBe(false);
    expect(outputsMatch(true, true, "exact")).toBe(true);
  });

  it("sorted ignores top-level order", () => {
    expect(outputsMatch([2, 1], [1, 2], "sorted")).toBe(true);
    expect(outputsMatch(["()()", "(())"], ["(())", "()()"], "sorted")).toBe(true);
    expect(outputsMatch([1, 1], [1, 2], "sorted")).toBe(false);
  });

  it("deep-sorted ignores order at both levels", () => {
    expect(outputsMatch([["tea", "eat"], ["bat"]], [["bat"], ["eat", "tea"]], "deep-sorted")).toBe(
      true,
    );
    expect(outputsMatch([["a", "b"]], [["a"], ["b"]], "deep-sorted")).toBe(false);
  });

  it("float tolerates rounding", () => {
    expect(outputsMatch(0.1 + 0.2, 0.3, "float")).toBe(true);
    expect(outputsMatch("0.3", 0.3, "float")).toBe(false);
  });
});

describe("starter code", () => {
  it("uses snake_case for Python and camelCase for JavaScript", () => {
    expect(camelCase("length_of_lis")).toBe("lengthOfLis");
    expect(starterCode("python", "two_sum", ["nums", "target"])).toContain(
      "def two_sum(nums, target):",
    );
    expect(starterCode("javascript", "two_sum", ["nums", "target"])).toContain(
      "function twoSum(nums, target)",
    );
  });
});
