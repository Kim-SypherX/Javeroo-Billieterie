import type { PaymentMethodId, UemoaCountryCode } from "@/config/uemoa";
import type { OrganizerView } from "@/modules/events/types";

export type VoteCategoryId =
  | "miss"
  | "awards"
  | "musique"
  | "sport"
  | "createur"
  | "etudiant";

export type VoteCampaignStatus = "OPEN" | "PAUSED" | "CLOSED";

export const VOTE_CATEGORIES: ReadonlyArray<{ id: VoteCategoryId; label: string }> = [
  { id: "miss", label: "Miss & Beauté" },
  { id: "awards", label: "Awards & Trophées" },
  { id: "musique", label: "Musique & Artistes" },
  { id: "createur", label: "Créateurs & Influence" },
  { id: "sport", label: "Sport & MVP" },
  { id: "etudiant", label: "Écoles & Universités" },
];

export const VOTE_CATEGORY_MAP: Record<VoteCategoryId, { id: VoteCategoryId; label: string }> =
  Object.fromEntries(VOTE_CATEGORIES.map((c) => [c.id, c])) as Record<
    VoteCategoryId,
    { id: VoteCategoryId; label: string }
  >;

export interface VoteCandidateView {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  bio: string;
  photoUrl?: string;
  accentColor: string;
  votesCount: number;
  grossRaisedXof: number;
}

export interface VoteCampaignView {
  id: string;
  slug: string;
  title: string;
  shortSummary: string;
  description: string;
  category: VoteCategoryId;
  countryCode: UemoaCountryCode;
  city: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: VoteCampaignStatus;
  isFeatured: boolean;
  showLiveResults: boolean;
  unitVotePriceXof: number;
  minVotesPerTx: number;
  maxVotesPerTx: number;
  quickPacks: number[];
  commissionBps: number;
  coverImageUrl?: string;
  bannerTheme: {
    from: string;
    via: string;
    to: string;
    badge: string;
  };
  organizerId: string;
  organizer: OrganizerView;
  candidates: VoteCandidateView[];
}

export interface VoteTransactionView {
  id: string;
  receiptToken: string;
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  countryCode: UemoaCountryCode;
  candidateId: string;
  candidateCode: string;
  candidateName: string;
  votesCount: number;
  unitVotePriceXof: number;
  totalPaidXof: number;
  platformCommissionXof: number;
  organizerNetXof: number;
  voterName: string;
  voterPhone: string;
  paymentMethod: PaymentMethodId;
  paymentProviderRef: string;
  createdAt: string;
}

export function getCampaignTotalVotes(campaign: VoteCampaignView): number {
  return campaign.candidates.reduce((sum, c) => sum + c.votesCount, 0);
}

export function getCampaignGrossXof(campaign: VoteCampaignView): number {
  return campaign.candidates.reduce((sum, c) => sum + c.grossRaisedXof, 0);
}

export function getCampaignCommissionXof(campaign: VoteCampaignView): number {
  const gross = getCampaignGrossXof(campaign);
  return Math.round((gross * campaign.commissionBps) / 10_000);
}

export function getRankedCandidates(campaign: VoteCampaignView): Array<
  VoteCandidateView & { rank: number; sharePercent: number }
> {
  const totalVotes = getCampaignTotalVotes(campaign);
  const sorted = [...campaign.candidates].sort(
    (a, b) => b.votesCount - a.votesCount || a.code.localeCompare(b.code),
  );
  return sorted.map((c, idx) => ({
    ...c,
    rank: idx + 1,
    sharePercent: totalVotes > 0 ? Math.round((c.votesCount / totalVotes) * 1000) / 10 : 0,
  }));
}

