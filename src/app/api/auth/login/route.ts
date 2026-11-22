import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSessionCookieConfig, signSessionToken } from "@/modules/auth/session";
import { authenticateUser } from "@/modules/auth/store";

const loginSchema = z.object({
  emailOrPhone: z.string().trim().min(3, "Identifiant requis."),
  password: z.string().min(6, "Mot de passe requis."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Identifiants invalides." },
        { status: 400 },
      );
    }

    const sessionData = authenticateUser(parsed.data.emailOrPhone, parsed.data.password);
    if (!sessionData) {
      return NextResponse.json(
        { ok: false, error: "Identifiant ou mot de passe incorrect." },
        { status: 401 },
      );
    }

    const token = signSessionToken(sessionData);
    const response = NextResponse.json({ ok: true, user: sessionData });
    response.cookies.set(buildSessionCookieConfig(token));
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la connexion." },
      { status: 500 },
    );
  }
}

