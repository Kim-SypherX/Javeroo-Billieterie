import crypto from "node:crypto";
import { PRICING_CONFIG } from "@/config/pricing";
import {
  getCountryByCode,
  type PaymentMethodId,
  type UemoaCountryCode,
} from "@/config/uemoa";
import { listAllOrganizers, registerOrganizationInStore } from "@/modules/events/store";
import { recordOrderInLedger } from "@/modules/operations/store";
import { getPaymentGateway } from "@/modules/payments/adapter";
import { buildSeedVoteCampaigns } from "./dev-data";
import {
  getCampaignCommissionXof,
  getCampaignGrossXof,
  getCampaignTotalVotes,
  type VoteCampaignStatus,
  type VoteCampaignView,
  type VoteCandidateView,
  type VoteCategoryId,
  type VoteTransactionView,
} from "./types";

interface VotesRuntimeState {
  campaigns: VoteCampaignView[];
  transactions: VoteTransactionView[];
  appliedTxIds: Set<string>;
}

declare global {
  var __javerooVotesState: VotesRuntimeState | undefined;
}

const CANDIDATE_PALETTE = [
  "#0EA5A4",
  "#6366F1",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#0284C7",
  "#8B5CF6",
  "#EF4444",
];

function getVotesState(): VotesRuntimeState {
  if (!globalThis.__javerooVotesState) {
    globalThis.__javerooVotesState = {
      campaigns: buildSeedVoteCampaigns(),
      transactions: [],
      appliedTxIds: new Set(),
    };
  }
  return globalThis.__javerooVotesState;
}

export function listAllVoteCampaigns(): VoteCampaignView[] {
  return [...getVotesState().campaigns];
}

export function listFeaturedVoteCampaigns(limit = 3): VoteCampaignView[] {
  return getVotesState()
    .campaigns.filter((c) => c.isFeatured && c.status !== "CLOSED")
    .slice(0, limit);
}

export function listVoteCampaignsForOrganization(organizationId: string): VoteCampaignView[] {
  return getVotesState().campaigns.filter((c) => c.organizerId === organizationId);
}

export function getVoteCampaignBySlug(slug: string): VoteCampaignView | null {
  return getVotesState().campaigns.find((c) => c.slug === slug) ?? null;
}

export function getVoteCampaignById(id: string): VoteCampaignView | null {
  return getVotesState().campaigns.find((c) => c.id === id) ?? null;
}

export function listVoteTransactions(campaignId?: string): VoteTransactionView[] {
  const all = getVotesState().transactions;
  if (!campaignId) return [...all];
  return all.filter((t) => t.campaignId === campaignId);
}

export function searchVoteCampaigns(filters: {
  pays?: string;
  categorie?: string;
  q?: string;
}): VoteCampaignView[] {
  let list = [...getVotesState().campaigns];

  if (filters.pays && filters.pays !== "ALL") {
    list = list.filter((c) => c.countryCode === filters.pays);
  }
  if (filters.categorie && filters.categorie !== "ALL") {
    list = list.filter((c) => c.category === filters.categorie);
  }
  if (filters.q && filters.q.trim().length > 0) {
    const q = filters.q.trim().toLowerCase();
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.organizer.name.toLowerCase().includes(q) ||
        c.candidates.some(
          (cand) =>
            cand.name.toLowerCase().includes(q) ||
            cand.code.toLowerCase().includes(q) ||
            cand.subtitle.toLowerCase().includes(q),
        ),
    );
  }

  return list.sort((a, b) => {
    // Campagnes ouvertes d'abord, puis par total de votes
    if (a.status === "OPEN" && b.status !== "OPEN") return -1;
    if (b.status === "OPEN" && a.status !== "OPEN") return 1;
    return getCampaignTotalVotes(b) - getCampaignTotalVotes(a);
  });
}

export function createVoteCampaign(input: {
  organizationId?: string;
  title: string;
  shortSummary: string;
  description: string;
  category: VoteCategoryId;
  countryCode: UemoaCountryCode;
  city: string;
  startsAt: string;
  endsAt: string;
  unitVotePriceXof: number;
  maxVotesPerTx?: number;
  quickPacks?: number[];
  showLiveResults?: boolean;
  coverImageUrl?: string;
  candidates: ReadonlyArray<{
    code?: string;
    name: string;
    subtitle?: string;
    bio?: string;
    photoUrl?: string;
  }>;
}): VoteCampaignView {
  const state = getVotesState();
  const organizers = listAllOrganizers();
  const organizer =
    (input.organizationId
      ? organizers.find((o) => o.id === input.organizationId)
      : undefined) ?? organizers[0]!;
  const country = getCountryByCode(input.countryCode);

  const baseSlug = input.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 75);
  const slug = `${baseSlug || "concours"}-${crypto.randomBytes(2).toString("hex")}`;
  const id = `vote-${crypto.randomBytes(5).toString("hex")}`;

  const unitPrice = Math.max(0, Math.round(input.unitVotePriceXof));
  const defaultPacks = unitPrice === 0 ? [1] : [1, 5, 10, 25, 50, 100];
  const quickPacks =
    input.quickPacks && input.quickPacks.length > 0
      ? input.quickPacks.map((n) => Math.max(1, Math.round(n)))
      : defaultPacks;

  const candidates: VoteCandidateView[] = input.candidates.map((cand, idx) => ({
    id: `cand-${crypto.randomBytes(4).toString("hex")}`,
    code: cand.code?.trim().toUpperCase() || `C${String(idx + 1).padStart(2, "0")}`,
    name: cand.name.trim(),
    subtitle: cand.subtitle?.trim() || `${input.city} · ${country.name}`,
    bio: cand.bio?.trim() || `Candidat officiel au concours ${input.title.trim()}.`,
    photoUrl: cand.photoUrl || undefined,
    accentColor: CANDIDATE_PALETTE[idx % CANDIDATE_PALETTE.length]!,
    votesCount: 0,
    grossRaisedXof: 0,
  }));

  const campaign: VoteCampaignView = {
    id,
    slug,
    title: input.title.trim(),
    shortSummary: input.shortSummary.trim(),
    description: input.description.trim(),
    category: input.category,
    countryCode: input.countryCode,
    city: input.city.trim(),
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: new Date(input.endsAt).toISOString(),
    timezone: country.timezone,
    status: "OPEN",
    isFeatured: false,
    showLiveResults: input.showLiveResults ?? true,
    unitVotePriceXof: unitPrice,
    minVotesPerTx: 1,
    maxVotesPerTx: unitPrice === 0 ? 1 : Math.max(1, Math.min(2000, input.maxVotesPerTx ?? 500)),
    quickPacks,
    commissionBps: PRICING_CONFIG.standardCommissionBps,
    coverImageUrl: input.coverImageUrl || undefined,
    bannerTheme: {
      from: "#1B2A4A",
      via: "#0F4C81",
      to: "#0EA5A4",
      badge: "NOUVEAU VOTE",
    },
    organizerId: organizer.id,
    organizer,
    candidates,
  };

  state.campaigns.unshift(campaign);
  return campaign;
}

export function addCandidateToVoteCampaign(
  campaignId: string,
  input: { code?: string; name: string; subtitle?: string; bio?: string; photoUrl?: string },
): { ok: true; campaign: VoteCampaignView; candidate: VoteCandidateView } | { ok: false; error: string } {
  const campaign = getVoteCampaignById(campaignId);
  if (!campaign) {
    return { ok: false, error: "Campagne de vote introuvable." };
  }
  if (campaign.candidates.length >= 40) {
    return { ok: false, error: "Maximum 40 candidats par campagne atteint." };
  }

  const nextIdx = campaign.candidates.length;
  const candidate: VoteCandidateView = {
    id: `cand-${crypto.randomBytes(4).toString("hex")}`,
    code: input.code?.trim().toUpperCase() || `C${String(nextIdx + 1).padStart(2, "0")}`,
    name: input.name.trim(),
    subtitle: input.subtitle?.trim() || `${campaign.city}`,
    bio: input.bio?.trim() || `Candidat officiel au concours ${campaign.title}.`,
    photoUrl: input.photoUrl || undefined,
    accentColor: CANDIDATE_PALETTE[nextIdx % CANDIDATE_PALETTE.length]!,
    votesCount: 0,
    grossRaisedXof: 0,
  };

  campaign.candidates.push(candidate);
  return { ok: true, campaign, candidate };
}

export function updateVoteCampaignSettings(
  campaignId: string,
  patch: { status?: VoteCampaignStatus; showLiveResults?: boolean; isFeatured?: boolean },
): VoteCampaignView | null {
  const campaign = getVoteCampaignById(campaignId);
  if (!campaign) return null;
  if (patch.status) campaign.status = patch.status;
  if (typeof patch.showLiveResults === "boolean") campaign.showLiveResults = patch.showLiveResults;
  if (typeof patch.isFeatured === "boolean") campaign.isFeatured = patch.isFeatured;
  return campaign;
}

export function deleteVoteCampaignById(campaignId: string): VoteCampaignView | null {
  const state = getVotesState();
  const idx = state.campaigns.findIndex((c) => c.id === campaignId);
  if (idx === -1) return null;
  const [removed] = state.campaigns.splice(idx, 1);
  return removed ?? null;
}

/**
 * Enregistre un vote payant (ou gratuit) avec paiement Mobile Money (Adapter PSP),
 * déduction stricte des 8 % côté organisateur (0 FCFA ajouté au votant),
 * incrémentation atomique du candidat et écriture au grand livre comptable.
 */
export async function castCandidateVotes(params: {
  campaignId: string;
  candidateId: string;
  votesCount: number;
  voterName?: string;
  voterPhone: string;
  paymentMethod: PaymentMethodId;
}): Promise<
  | { ok: true; transaction: VoteTransactionView; campaign: VoteCampaignView; candidate: VoteCandidateView }
  | { ok: false; error: string }
> {
  const state = getVotesState();
  const campaign = state.campaigns.find((c) => c.id === params.campaignId);
  if (!campaign) {
    return { ok: false, error: "Campagne de vote introuvable." };
  }
  if (campaign.status === "PAUSED") {
    return { ok: false, error: "Les votes sont momentanément en pause pour ce concours." };
  }
  if (campaign.status === "CLOSED") {
    return { ok: false, error: "Les votes sont clôturés pour ce concours." };
  }

  const candidate = campaign.candidates.find((c) => c.id === params.candidateId);
  if (!candidate) {
    return { ok: false, error: "Candidat introuvable dans ce concours." };
  }

  const qty = Math.round(params.votesCount);
  if (qty < campaign.minVotesPerTx || qty > campaign.maxVotesPerTx) {
    return {
      ok: false,
      error: `Choisissez entre ${campaign.minVotesPerTx} et ${campaign.maxVotesPerTx} voix par transaction.`,
    };
  }

  const totalPaidXof = qty * campaign.unitVotePriceXof;
  const platformCommissionXof =
    totalPaidXof > 0 ? Math.round((totalPaidXof * campaign.commissionBps) / 10_000) : 0;
  const organizerNetXof = Math.max(0, totalPaidXof - platformCommissionXof);

  const txId = `vtx-${crypto.randomBytes(6).toString("hex")}`;
  const receiptToken = `VOT-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;

  let providerRef = `FREE-VOTE-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  if (totalPaidXof > 0) {
    const gateway = getPaymentGateway();
    const init = await gateway.initiatePayment({
      orderId: txId,
      idempotencyKey: `idem-${txId}`,
      amountXof: totalPaidXof,
      countryCode: campaign.countryCode,
      method: params.paymentMethod,
      customerPhone: params.voterPhone,
      customerName: params.voterName?.trim() || "Supporter Javeroo",
      description: `${qty} vote(s) pour ${candidate.name} (${candidate.code}) — ${campaign.title}`,
    });
    const verified = await gateway.verifyTransaction(init.providerRef, totalPaidXof);
    if (verified.status !== "SUCCEEDED") {
      return { ok: false, error: "Le paiement Mobile Money n'a pas pu être confirmé." };
    }
    providerRef = init.providerRef;
  }

  // Incrémentation atomique du candidat
  candidate.votesCount += qty;
  candidate.grossRaisedXof += totalPaidXof;

  const transaction: VoteTransactionView = {
    id: txId,
    receiptToken,
    campaignId: campaign.id,
    campaignSlug: campaign.slug,
    campaignTitle: campaign.title,
    countryCode: campaign.countryCode,
    candidateId: candidate.id,
    candidateCode: candidate.code,
    candidateName: candidate.name,
    votesCount: qty,
    unitVotePriceXof: campaign.unitVotePriceXof,
    totalPaidXof,
    platformCommissionXof,
    organizerNetXof,
    voterName: params.voterName?.trim() || "Supporter",
    voterPhone: params.voterPhone.trim(),
    paymentMethod: params.paymentMethod,
    paymentProviderRef: providerRef,
    createdAt: new Date().toISOString(),
  };

  state.transactions.unshift(transaction);
  state.appliedTxIds.add(transaction.id);

  // Écriture dans le grand livre comptable de l'organisateur (8 % côté organisateur)
  if (totalPaidXof > 0) {
    recordOrderInLedger({
      organizationId: campaign.organizerId,
      orderId: transaction.id,
      eventTitle: `Votes (${qty}× ${candidate.name}) — ${campaign.title}`,
      netAfterDiscountXof: totalPaidXof,
      platformCommissionXof,
      feeBearer: "ORGANIZER",
    });
  }

  return { ok: true, transaction, campaign, candidate };
}

/**
 * Réhydrate une campagne personnalisée depuis un cookie signé cross-Lambda.
 */
export function upsertVoteCampaignInStore(campaign: VoteCampaignView): void {
  const state = getVotesState();
  registerOrganizationInStore({
    id: campaign.organizer.id,
    slug: campaign.organizer.slug,
    name: campaign.organizer.name,
    countryCode: campaign.organizer.countryCode,
    city: campaign.organizer.city,
    supportPhone: campaign.organizer.supportPhone,
    supportEmail: campaign.organizer.supportEmail,
  });

  const existing = state.campaigns.find((c) => c.id === campaign.id || c.slug === campaign.slug);
  if (!existing) {
    state.campaigns.unshift(campaign);
    return;
  }

  // Met à jour le statut, les options et fusionne les éventuels candidats ajoutés sur une autre instance
  existing.status = campaign.status;
  existing.showLiveResults = campaign.showLiveResults;
  existing.isFeatured = campaign.isFeatured;
  for (const cand of campaign.candidates) {
    const localCand = existing.candidates.find((c) => c.id === cand.id);
    if (!localCand) {
      existing.candidates.push(cand);
    } else {
      localCand.votesCount = Math.max(localCand.votesCount, cand.votesCount);
      localCand.grossRaisedXof = Math.max(localCand.grossRaisedXof, cand.grossRaisedXof);
    }
  }
}

/**
 * Réhydrate une transaction de vote issue d'une autre instance serverless de façon idempotente.
 */
export function applyVoteTransactionIdempotently(tx: VoteTransactionView): void {
  const state = getVotesState();
  if (state.appliedTxIds.has(tx.id)) return;
  state.appliedTxIds.add(tx.id);
  state.transactions.unshift(tx);

  const campaign = state.campaigns.find((c) => c.id === tx.campaignId);
  const candidate = campaign?.candidates.find((c) => c.id === tx.candidateId);
  if (candidate) {
    candidate.votesCount += tx.votesCount;
    candidate.grossRaisedXof += tx.totalPaidXof;
  }
}

export function getVotesGlobalSummary(campaignsOverride?: VoteCampaignView[]) {
  const campaigns = campaignsOverride ?? getVotesState().campaigns;
  const totalVotes = campaigns.reduce((s, c) => s + getCampaignTotalVotes(c), 0);
  const totalGrossXof = campaigns.reduce((s, c) => s + getCampaignGrossXof(c), 0);
  const totalCommissionXof = campaigns.reduce((s, c) => s + getCampaignCommissionXof(c), 0);
  return {
    campaignsCount: campaigns.length,
    openCampaignsCount: campaigns.filter((c) => c.status === "OPEN").length,
    totalCandidates: campaigns.reduce((s, c) => s + c.candidates.length, 0),
    totalVotes,
    totalGrossXof,
    totalCommissionXof,
    totalOrganizerNetXof: Math.max(0, totalGrossXof - totalCommissionXof),
  };
}

function escapeCsvCell(val: string | number | undefined): string {
  const str = String(val ?? "");
  if (/[",;\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildVoteCampaignResultsCsv(campaign: VoteCampaignView): string {
  const totalVotes = getCampaignTotalVotes(campaign);
  const sorted = [...campaign.candidates].sort(
    (a, b) => b.votesCount - a.votesCount || a.code.localeCompare(b.code),
  );
  const header = [
    "Rang",
    "Code Candidat",
    "Nom du Candidat",
    "Sous-titre / Région",
    "Nombre de Voix",
    "Part (%)",
    "Recettes Brutes (FCFA)",
    `Commission Javeroo (${PRICING_CONFIG.standardCommissionPercent} %)`,
    "Net Promoteur (FCFA)",
  ];
  const rows = sorted.map((c, idx) => {
    const share = totalVotes > 0 ? ((c.votesCount / totalVotes) * 100).toFixed(1) : "0.0";
    const comm = Math.round((c.grossRaisedXof * campaign.commissionBps) / 10_000);
    const net = Math.max(0, c.grossRaisedXof - comm);
    return [
      idx + 1,
      escapeCsvCell(c.code),
      escapeCsvCell(c.name),
      escapeCsvCell(c.subtitle),
      c.votesCount,
      `${share}%`,
      c.grossRaisedXof,
      comm,
      net,
    ];
  });

  return "\uFEFF" + [header.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
}

