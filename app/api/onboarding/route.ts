// PUT one onboarding step. Saves the step's fields and advances users.onboardingStep,
// so quitting mid-way resumes at the right step.
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { nextStep, OnboardingRequestSchema, type OnboardingRequest } from "@/lib/onboarding";
import { errorResponse, requireUid } from "@/lib/server/session";
import { getCompanies } from "@/lib/server/users";

async function fieldsFor(
  request: OnboardingRequest,
): Promise<{ updates: Record<string, unknown> } | { error: string }> {
  switch (request.step) {
    case "target": {
      const known = new Set((await getCompanies()).map((c) => c.id));
      const unknown = request.targetCompanies.filter((id) => !known.has(id));
      if (unknown.length > 0) return { error: `Unknown company: ${unknown.join(", ")}` };
      return {
        updates: {
          "profile.targetRole": request.targetRole,
          "profile.targetCompanies": [...new Set(request.targetCompanies)],
        },
      };
    }
    case "timeline": {
      const placementDate = new Date(`${request.placementDate}T00:00:00Z`);
      if (Number.isNaN(placementDate.getTime())) return { error: "Invalid date" };
      return {
        updates: {
          "profile.placementDate": placementDate,
          "profile.hoursPerDay": request.hoursPerDay,
        },
      };
    }
    case "assessment":
      return { updates: { assessmentStatus: "skipped" } };
  }
}

export async function PUT(request: Request) {
  try {
    const uid = await requireUid();
    const parsed = OnboardingRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const result = await fieldsFor(parsed.data);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

    const onboardingStep = nextStep(parsed.data.step);
    await getAdminDb()
      .collection("users")
      .doc(uid)
      .update({ ...result.updates, onboardingStep, lastActiveAt: new Date() });

    return NextResponse.json({ onboardingStep });
  } catch (error) {
    return errorResponse(error);
  }
}
