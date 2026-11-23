import crypto from "node:crypto";
import { cookies } from "next/headers";
import { applyVoteTransactionIdempotently, upsertVoteCampaignInStore } from "./store";
import type { VoteCampaignView, VoteTransactionView } from "./types";

const VOTE_CAMPAIGNS_COOKIE = "javeroo_vote_campaigns";
const VOTE_TXS_COOKIE = "javeroo_vote_txs";
const MAX_STORED_CAMPAIGNS = 3;
const MAX_STORED_TXS = 8;
const MAX_COOKIE_CHARS = 3700;

function getCookieSecret(): string {
  return (
    process.env.SESSION_SECRET ??
    process.env.TICKET_SIGNING_SECRET ??
    "dev-session-secret-change-me-in-production-64-chars-javeroo-uemoa"
  );
}

function signPayload(encoded: string): string {
  return crypto
    .createHmac("sha256", getCookieSecret())
    .update(encoded)
    .digest("base64url")
    .slice(0, 32);
}

function verifyAndDecode<T>(rawValue: string | undefined): T[] {
  if (!rawValue) return [];
  const dotIdx = rawValue.lastIndexOf(".");
  if (dotIdx <= 0) return [];
  const encoded = rawValue.slice(0, dotIdx);
  const sig = rawValue.slice(dotIdx + 1);
  const expected = signPayload(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return [];
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function compactCampaignForCookie(campaign: VoteCampaignView): VoteCampaignView {
  const safeCover =
    campaign.coverImageUrl && campaign.coverImageUrl.length <= 300
      ? campaign.coverImageUrl
      : undefined;
  return {
    ...campaign,
    shortSummary: campaign.shortSummary.slice(0, 150),
    description: campaign.description.slice(0, 350),
    coverImageUrl: safeCover,
    organizer: {
      ...campaign.organizer,
      bio: campaign.organizer.bio.slice(0, 100),
    },
    candidates: campaign.candidates.slice(0, 15).map((cand) => ({
      ...cand,
      subtitle: cand.subtitle.slice(0, 60),
      bio: cand.bio.slice(0, 100),
      photoUrl: cand.photoUrl && cand.photoUrl.length <= 250 ? cand.photoUrl : undefined,
    })),
  };
}

export function serializeSignedVoteCampaigns(campaigns: VoteCampaignView[]): string {
  let list = campaigns.slice(0, MAX_STORED_CAMPAIGNS).map(compactCampaignForCookie);
  while (list.length > 0) {
    const encoded = Buffer.from(JSON.stringify(list), "utf8").toString("base64url");
    const signed = `${encoded}.${signPayload(encoded)}`;
    if (signed.length <= MAX_COOKIE_CHARS || list.length === 1) {
      return signed;
    }
    list = list.slice(0, list.length - 1);
  }
  return "";
}

export function parseSignedVoteCampaigns(rawValue: string | undefined): VoteCampaignView[] {
  return verifyAndDecode<VoteCampaignView>(rawValue);
}

export function serializeSignedVoteTransactions(txs: VoteTransactionView[]): string {
  let list = txs.slice(0, MAX_STORED_TXS);
  while (list.length > 0) {
    const encoded = Buffer.from(JSON.stringify(list), "utf8").toString("base64url");
    const signed = `${encoded}.${signPayload(encoded)}`;
    if (signed.length <= MAX_COOKIE_CHARS || list.length === 1) {
      return signed;
    }
    list = list.slice(0, list.length - 1);
  }
  return "";
}

export function parseSignedVoteTransactions(rawValue: string | undefined): VoteTransactionView[] {
  return verifyAndDecode<VoteTransactionView>(rawValue);
}

export async function readVoteCampaignsFromCookie(): Promise<VoteCampaignView[]> {
  try {
    const store = await cookies();
    return parseSignedVoteCampaigns(store.get(VOTE_CAMPAIGNS_COOKIE)?.value);
  } catch {
    return [];
  }
}

export async function readVoteTransactionsFromCookie(): Promise<VoteTransactionView[]> {
  try {
    const store = await cookies();
    return parseSignedVoteTransactions(store.get(VOTE_TXS_COOKIE)?.value);
  } catch {
    return [];
  }
}

/**
 * Réhydrate à la fois les campagnes de vote créées et les transactions de vote récentes
 * entre toutes les instances serverless Vercel (zéro 404, scores toujours à jour).
 */
export async function hydrateVotesIntoStore(): Promise<void> {
  const campaigns = await readVoteCampaignsFromCookie();
  for (const camp of campaigns) {
    upsertVoteCampaignInStore(camp);
  }
  const txs = await readVoteTransactionsFromCookie();
  // Appliquer du plus ancien au plus récent
  for (let i = txs.length - 1; i >= 0; i--) {
    const tx = txs[i];
    if (tx) applyVoteTransactionIdempotently(tx);
  }
}

export async function buildUpdatedVoteCampaignsCookie(campaign: VoteCampaignView) {
  const existing = await readVoteCampaignsFromCookie();
  const deduped = [
    campaign,
    ...existing.filter((c) => c.id !== campaign.id && c.slug !== campaign.slug),
  ];
  return {
    name: VOTE_CAMPAIGNS_COOKIE,
    value: serializeSignedVoteCampaigns(deduped),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}

export async function buildVoteCampaignsCookieWithout(campaignId: string) {
  const existing = await readVoteCampaignsFromCookie();
  const remaining = existing.filter((c) => c.id !== campaignId);
  return {
    name: VOTE_CAMPAIGNS_COOKIE,
    value: serializeSignedVoteCampaigns(remaining),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remaining.length > 0 ? 60 * 60 * 24 * 14 : 0,
  };
}

export async function buildUpdatedVoteTransactionsCookie(tx: VoteTransactionView) {
  const existing = await readVoteTransactionsFromCookie();
  const deduped = [tx, ...existing.filter((t) => t.id !== tx.id)];
  return {
    name: VOTE_TXS_COOKIE,
    value: serializeSignedVoteTransactions(deduped),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}

