import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VoteCampaignViewClient } from "@/components/VoteCampaignViewClient";
import { SITE_CONFIG } from "@/config/site";
import { hydrateVotesIntoStore } from "@/modules/votes/cookie-store";
import { getVoteCampaignBySlug } from "@/modules/votes/store";

export const dynamic = "force-dynamic";

interface VoteDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: VoteDetailPageProps): Promise<Metadata> {
  await hydrateVotesIntoStore();
  const { slug } = await params;
  const campaign = getVoteCampaignBySlug(slug);
  if (!campaign) {
    return { title: "Concours de vote introuvable" };
  }
  return {
    title: `${campaign.title} — Votes en ligne`,
    description: campaign.shortSummary,
    openGraph: {
      title: `${campaign.title} | ${SITE_CONFIG.brandName}`,
      description: campaign.shortSummary,
      type: "website",
    },
  };
}

export default async function VoteCampaignDetailPage({
  params,
  searchParams,
}: VoteDetailPageProps) {
  await hydrateVotesIntoStore();
  const { slug } = await params;
  const sp = await searchParams;
  const candidatParam = typeof sp.candidat === "string" ? sp.candidat : undefined;

  const campaign = getVoteCampaignBySlug(slug);
  if (!campaign) notFound();

  return (
    <VoteCampaignViewClient
      initialCampaign={campaign}
      initialCandidateParam={candidatParam}
    />
  );
}

