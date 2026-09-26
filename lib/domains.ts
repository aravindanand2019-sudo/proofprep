// Maps a student's target role (and companies) to a coding-practice domain.
import type { Company, Domain } from "./schemas/index.ts";

export const DOMAIN_LABELS: Record<Domain, string> = {
  sde: "Product SDE",
  fullstack: "Full-stack / Web",
  "data-ml": "Data / ML",
  service: "Service company",
};

const RULES: Array<[RegExp, Domain]> = [
  [/\b(data|ml|machine learning|ai|analyst|analytics|scientist)\b/i, "data-ml"],
  [/\b(full[\s-]?stack|web|front[\s-]?end|back[\s-]?end|react|node|mern)\b/i, "fullstack"],
  [/\b(associate|service|tcs|infosys|wipro|accenture|cognizant|trainee)\b/i, "service"],
];

/** Role keywords decide; otherwise all-service-company targets mean "service"; else "sde". */
export function domainFor(
  role: string | undefined,
  companies: Array<Pick<Company, "tier">>,
): Domain {
  for (const [pattern, domain] of RULES) if (role && pattern.test(role)) return domain;
  if (companies.length > 0 && companies.every((c) => c.tier === "service")) return "service";
  return "sde";
}
