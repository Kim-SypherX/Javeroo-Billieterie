import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/modules/auth/session";
import { markOrganizationVerified } from "@/modules/events/store";
import { reviewKycSubmission } from "@/modules/operations/store";

const reviewSchema = z.object({
  kycId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().trim().max(240).optional(),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ ok: false, error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Paramètres invalides." }, { status: 400 });
    }

    const updated = reviewKycSubmission({
      ...parsed.data,
      actorName: session.fullName,
      onApproved: (orgId) => markOrganizationVerified(orgId),
    });

    if (!updated) {
      return NextResponse.json({ ok: false, error: "Dossier KYC introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, submission: updated });
  } catch {
    return NextResponse.json({ ok: false, error: "Erreur lors de la validation KYC." }, { status: 500 });
  }
}

