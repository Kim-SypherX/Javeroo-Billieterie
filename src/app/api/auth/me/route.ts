import { NextResponse } from "next/server";
import { getCurrentSession } from "@/modules/auth/session";

export async function GET() {
  const session = await getCurrentSession();
  return NextResponse.json({ authenticated: Boolean(session), user: session });
}

