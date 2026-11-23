import { NextResponse } from "next/server";
import { getCurrentSession } from "@/modules/auth/session";
import { hydrateVotesIntoStore } from "@/modules/votes/cookie-store";
import { buildVoteCampaignResultsCsv, getVoteCampaignById } from "@/modules/votes/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  await hydrateVotesIntoStore();
  const { campaignId } = await context.params;
  const campaign = getVoteCampaignById(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "Campagne de vote introuvable." }, { status: 404 });
  }
  if (session.role !== "PLATFORM_ADMIN" && campaign.organizerId !== session.organizationId) {
    return NextResponse.json(
      { error: "Accès refusé : cette campagne appartient à un autre promoteur." },
      { status: 403 },
    );
  }

  const csv = buildVoteCampaignResultsCsv(campaign);
  const filename = `resultats-votes-${campaign.slug}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

