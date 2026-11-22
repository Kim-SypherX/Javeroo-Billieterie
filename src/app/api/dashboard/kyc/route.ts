import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/modules/auth/session";
import { submitOrganizationKyc } from "@/modules/operations/store";

const kycSchema = z.object({
  legalEntityType: z.enum(["INDIVIDUAL", "COMPANY"]),
  documentType: z.enum(["CNIB", "PASSPORT", "RCCM"]),
  documentReference: z.string().trim().min(4, "Indiquez le numéro ou la référence du document.").max(120),
  payoutMethod: z.enum(["MOBILE_MONEY", "BANK"]),
  payoutDestination: z
    .string()
    .trim()
    .min(6, "Indiquez le numéro Mobile Money ou le RIB de reversement.")
    .max(140),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json({ ok: false, error: "Authentification organisateur requise." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = kycSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Dossier KYC incomplet." },
        { status: 400 },
      );
    }

    const submission = submitOrganizationKyc({
      organizationId: session.organizationId ?? "org-faso-scene",
      organizationName: session.organizationName ?? session.fullName,
      ...parsed.data,
      actorName: session.fullName,
    });

    return NextResponse.json({ ok: true, submission }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Impossible d'enregistrer le dossier KYC." }, { status: 500 });
  }
}

