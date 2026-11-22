import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/modules/auth/session";
import { createOrganizationPayout } from "@/modules/operations/store";

const payoutSchema = z.object({
  amountXof: z.number().int().min(5000, "Montant minimum : 5 000 FCFA."),
  method: z.enum(["MOBILE_MONEY", "BANK"]),
  destination: z.string().trim().min(6, "Destination de reversement requise.").max(140),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json({ ok: false, error: "Authentification organisateur requise." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = payoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Demande de retrait invalide." },
        { status: 400 },
      );
    }

    const result = createOrganizationPayout({
      organizationId: session.organizationId ?? "org-faso-scene",
      organizationName: session.organizationName ?? session.fullName,
      amountXof: parsed.data.amountXof,
      method: parsed.data.method,
      destination: parsed.data.destination,
      actorName: session.fullName,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, payout: result.payout }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Erreur lors de la demande de retrait." }, { status: 500 });
  }
}

