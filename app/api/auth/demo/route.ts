// POST → a Firebase custom token for the fixed demo user. The client signs in with it
// and then goes through /api/auth/session like any other user.
import { NextResponse } from "next/server";
import { DEMO_UID } from "@/lib/auth/constants";
import { getAdminAuth } from "@/lib/firebase/admin";
import { errorResponse } from "@/lib/server/session";
import { ensureDemoUser } from "@/lib/server/users";

export async function POST() {
  try {
    await ensureDemoUser();
    const customToken = await getAdminAuth().createCustomToken(DEMO_UID);
    return NextResponse.json({ customToken });
  } catch (error) {
    return errorResponse(error);
  }
}
