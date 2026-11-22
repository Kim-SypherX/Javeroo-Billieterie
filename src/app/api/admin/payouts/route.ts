import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/modules/auth/session";
import { processAdminPayout } from "@/modules/operations/store";

const payoutDecisionSchema = z.object({
  payoutId: z.string().min(1),
  decision: z.enum(["COMPLETED", "REJECTED"]),
  externalReference: z.string().trim().max(120).optional(),
  rejectionReason: z.string().trim().max(240).optional(),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ ok: false, error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = payoutDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Paramètres invalides." }, { status: 400 });
    }

    const updated = processAdminPayout({
      ...parsed.data,
      actorName: session.fullName,
    });

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Demande introuvable ou déjà traitée." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, payout: updated });
  } catch {
    return NextResponse.json({ ok: false, error: "Erreur lors du traitement du virement." }, { status: 500 });
  }
}

