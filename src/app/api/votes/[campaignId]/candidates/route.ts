import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/modules/auth/session";
import { appendAuditLog } from "@/modules/operations/store";
import {
  buildUpdatedVoteCampaignsCookie,
  hydrateVotesIntoStore,
} from "@/modules/votes/cookie-store";
import { addCandidateToVoteCampaign, getVoteCampaignById } from "@/modules/votes/store";

const addCandidateSchema = z.object({
  code: z.string().trim().max(16).optional(),
  name: z.string().trim().min(2, "Indiquez le nom du candidat.").max(120),
  subtitle: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(400).optional(),
  photoUrl: z
    .string()
    .trim()
    .max(1_100_000)
    .refine(
      (val) =>
        val === "" ||
        val.startsWith("/uploads/") ||
        val.startsWith("https://") ||
        /^data:image\/(jpeg|png|webp|avif);base64,[A-Za-z0-9+/=]+$/.test(val),
      "Format de photo non autorisé.",
    )
    .optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json({ ok: false, error: "Authentification requise." }, { status: 401 });
  }

  try {
    await hydrateVotesIntoStore();
    const { campaignId } = await context.params;
    const campaign = getVoteCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ ok: false, error: "Campagne de vote introuvable." }, { status: 404 });
    }
    if (session.role !== "PLATFORM_ADMIN" && campaign.organizerId !== session.organizationId) {
      return NextResponse.json(
        { ok: false, error: "Vous ne pouvez ajouter des candidats qu'à vos propres campagnes." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = addCandidateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Données candidat invalides." },
        { status: 400 },
      );
    }

    const added = addCandidateToVoteCampaign(campaignId, {
      ...parsed.data,
      photoUrl: parsed.data.photoUrl || undefined,
    });
    if (!added.ok) {
      return NextResponse.json({ ok: false, error: added.error }, { status: 400 });
    }

    appendAuditLog(
      session.fullName,
      "VOTE_CANDIDATE_ADDED",
      added.campaign.title,
      `Candidat ${added.candidate.name} (${added.candidate.code}) ajouté.`,
    );

    const voteCookie = await buildUpdatedVoteCampaignsCookie(added.campaign);
    const response = NextResponse.json(
      { ok: true, candidate: added.candidate, campaign: added.campaign },
      { status: 201 },
    );
    response.cookies.set(voteCookie);
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Impossible d'ajouter ce candidat." }, { status: 500 });
  }
}

