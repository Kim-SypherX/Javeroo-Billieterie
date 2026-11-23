import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/modules/auth/session";
import { appendAuditLog } from "@/modules/operations/store";
import {
  buildUpdatedVoteCampaignsCookie,
  buildVoteCampaignsCookieWithout,
  hydrateVotesIntoStore,
} from "@/modules/votes/cookie-store";
import {
  deleteVoteCampaignById,
  getVoteCampaignById,
  updateVoteCampaignSettings,
} from "@/modules/votes/store";

const patchSchema = z.object({
  status: z.enum(["OPEN", "PAUSED", "CLOSED"]).optional(),
  showLiveResults: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export async function PATCH(
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
    const existing = getVoteCampaignById(campaignId);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Campagne de vote introuvable." }, { status: 404 });
    }

    if (session.role !== "PLATFORM_ADMIN" && existing.organizerId !== session.organizationId) {
      return NextResponse.json(
        { ok: false, error: "Accès refusé : cette campagne appartient à un autre promoteur." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Paramètres invalides." }, { status: 400 });
    }

    const updated = updateVoteCampaignSettings(campaignId, {
      status: parsed.data.status,
      showLiveResults: parsed.data.showLiveResults,
      // Seul le SuperAdmin contrôle la mise en avant « À la une »
      isFeatured: session.role === "PLATFORM_ADMIN" ? parsed.data.isFeatured : undefined,
    });
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Mise à jour impossible." }, { status: 404 });
    }

    appendAuditLog(
      session.fullName,
      "VOTE_CAMPAIGN_UPDATED",
      updated.title,
      `Statut=${updated.status}, Scores publics=${updated.showLiveResults ? "Oui" : "Non"}, Une=${updated.isFeatured ? "Oui" : "Non"}.`,
    );

    const voteCookie = await buildUpdatedVoteCampaignsCookie(updated);
    const response = NextResponse.json({ ok: true, campaign: updated });
    response.cookies.set(voteCookie);
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Erreur de mise à jour." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json({ ok: false, error: "Authentification requise." }, { status: 401 });
  }

  try {
    await hydrateVotesIntoStore();
    const { campaignId } = await context.params;
    const existing = getVoteCampaignById(campaignId);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Campagne de vote introuvable." }, { status: 404 });
    }

    if (session.role !== "PLATFORM_ADMIN" && existing.organizerId !== session.organizationId) {
      return NextResponse.json(
        { ok: false, error: "Accès refusé : cette campagne appartient à un autre promoteur." },
        { status: 403 },
      );
    }

    const removed = deleteVoteCampaignById(campaignId);
    if (!removed) {
      return NextResponse.json({ ok: false, error: "Campagne introuvable." }, { status: 404 });
    }

    appendAuditLog(
      session.fullName,
      "VOTE_CAMPAIGN_REMOVED",
      removed.title,
      `Campagne de vote supprimée (${removed.organizer.name}).`,
    );

    const updatedCookie = await buildVoteCampaignsCookieWithout(removed.id);
    const response = NextResponse.json({ ok: true, removedId: removed.id });
    response.cookies.set(updatedCookie);
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Suppression impossible." }, { status: 500 });
  }
}

