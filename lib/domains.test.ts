import { describe, expect, it } from "vitest";
import { domainFor } from "./domains.ts";

const product = { tier: "product" as const };
const service = { tier: "service" as const };

describe("domainFor", () => {
  it("reads the role first", () => {
    expect(domainFor("Data / ML Engineer", [product])).toBe("data-ml");
    expect(domainFor("Full-stack Developer", [product])).toBe("fullstack");
    expect(domainFor("Frontend engineer", [product])).toBe("fullstack");
    expect(domainFor("Associate Software Engineer (service company)", [product])).toBe("service");
  });

  it("uses the companies when the role is generic", () => {
    expect(domainFor("Software Development Engineer", [service, service])).toBe("service");
    expect(domainFor("Software Development Engineer", [service, product])).toBe("sde");
    expect(domainFor(undefined, [])).toBe("sde");
  });
});
