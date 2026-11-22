import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSessionCookieConfig, signSessionToken } from "@/modules/auth/session";
import { registerOrganizerUser } from "@/modules/auth/store";
import { registerOrganizationInStore } from "@/modules/events/store";

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Indiquez votre nom complet.").max(120),
  email: z.string().trim().email("Adresse e-mail invalide."),
  phone: z.string().trim().min(8, "Numéro WhatsApp / téléphone invalide.").max(32),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(128),
  organizationName: z.string().trim().min(2, "Indiquez le nom de votre structure.").max(160),
  countryCode: z.enum(["BF", "CI", "SN", "BJ", "TG", "ML", "NE", "GW"]),
  city: z.string().trim().min(2, "Indiquez votre ville.").max(100),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." },
        { status: 400 },
      );
    }

    const result = registerOrganizerUser({
      ...parsed.data,
      onOrganizationCreated: (org) => {
        registerOrganizationInStore(org);
      },
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    }

    const token = signSessionToken(result.session);
    const response = NextResponse.json({ ok: true, user: result.session }, { status: 201 });
    response.cookies.set(buildSessionCookieConfig(token));
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la création du compte." },
      { status: 500 },
    );
  }
}

