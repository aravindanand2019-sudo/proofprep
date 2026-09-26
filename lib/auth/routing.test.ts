import { describe, expect, it } from "vitest";
import { redirectFor } from "./routing.ts";

describe("redirectFor", () => {
  it("sends signed-out users to the login page", () => {
    expect(redirectFor("/home", null)).toBe("/");
    expect(redirectFor("/onboarding", null)).toBe("/");
    expect(redirectFor("/", null)).toBeNull();
  });

  it("sends new and partial users to onboarding", () => {
    expect(redirectFor("/", "target")).toBe("/onboarding");
    expect(redirectFor("/home", "timeline")).toBe("/onboarding");
    expect(redirectFor("/readiness/tcs-nqt", "optional")).toBe("/onboarding");
    expect(redirectFor("/onboarding", "timeline")).toBeNull();
  });

  it("lets users on the assessment step open the assessment", () => {
    expect(redirectFor("/assessment", "assessment")).toBeNull();
    expect(redirectFor("/assessment", "target")).toBe("/onboarding");
  });

  it("sends onboarded users home and keeps them out of onboarding", () => {
    expect(redirectFor("/", "done")).toBe("/home");
    expect(redirectFor("/onboarding", "done")).toBe("/home");
    expect(redirectFor("/home", "done")).toBeNull();
    expect(redirectFor("/readiness/amazon-sde", "done")).toBeNull();
  });

  it("always allows the status page", () => {
    expect(redirectFor("/status", null)).toBeNull();
    expect(redirectFor("/status", "target")).toBeNull();
  });
});
