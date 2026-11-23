import { describe, expect, it } from "vitest";
import { registerOrganizationInStore } from "@/modules/events/store";
import { getOrganizationWallet } from "@/modules/operations/store";
import {
  parseSignedVoteCampaigns,
  parseSignedVoteTransactions,
  serializeSignedVoteCampaigns,
  serializeSignedVoteTransactions,
} from "@/modules/votes/cookie-store";
import {
  addCandidateToVoteCampaign,
  applyVoteTransactionIdempotently,
  buildVoteCampaignResultsCsv,
  castCandidateVotes,
  createVoteCampaign,
  deleteVoteCampaignById,
  getVoteCampaignBySlug,
  listAllVoteCampaigns,
  listVoteCampaignsForOrganization,
  updateVoteCampaignSettings,
  upsertVoteCampaignInStore,
} from "@/modules/votes/store";
import { getRankedCandidates } from "@/modules/votes/types";

describe("Module Javeroo Votes — concours, paiements Mobile Money, isolation et cross-Lambda", () => {
  it("charge les concours de démonstration UEMOA et classe les candidats par voix décroissantes", () => {
    const all = listAllVoteCampaigns();
    expect(all.length).toBeGreaterThanOrEqual(3);

    const miss = all.find((c) => c.slug === "miss-jeunesse-burkina-2026");
    expect(miss).toBeDefined();
    const ranked = getRankedCandidates(miss!);
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked[0]!.votesCount).toBeGreaterThanOrEqual(ranked[1]!.votesCount);
    expect(ranked.reduce((s, r) => s + r.sharePercent, 0)).toBeGreaterThan(99);
  });

  it("isole strictement un nouveau promoteur (0 campagne initiale) puis permet la création, ajout de candidat et vote avec 8 % côté organisateur", async () => {
    const org = registerOrganizationInStore({
      id: "org-vote-elvis",
      slug: "elvis-awards-test",
      name: "Elvis Awards Prod",
      countryCode: "BF",
      city: "Ouagadougou",
      supportPhone: "+226 70 12 34 56",
      supportEmail: "elvis-awards@example.com",
    });

    expect(listVoteCampaignsForOrganization(org.id)).toHaveLength(0);

    const campaign = createVoteCampaign({
      organizationId: org.id,
      title: "Prix Meilleur Graphiste Burkina 2026",
      shortSummary: "Votez pour le meilleur graphiste du Burkina (200 FCFA / voix).",
      description: "Concours national récompensant les talents créatifs digitaux du Burkina Faso.",
      category: "createur",
      countryCode: "BF",
      city: "Ouagadougou",
      startsAt: "2026-11-23T08:00",
      endsAt: "2026-12-30T23:59",
      unitVotePriceXof: 200,
      candidates: [
        { code: "G01", name: "Elvis Design", subtitle: "Ouagadougou" },
        { code: "G02", name: "Kadi Visuals", subtitle: "Bobo-Dioulasso" },
      ],
    });

    expect(listVoteCampaignsForOrganization(org.id)).toHaveLength(1);
    expect(campaign.candidates).toHaveLength(2);

    // Ajout d'un 3e candidat à chaud
    const added = addCandidateToVoteCampaign(campaign.id, {
      name: "Oumar Motion",
      subtitle: "Koudougou",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.campaign.candidates).toHaveLength(3);

    // Vote pack de 25 voix × 200 FCFA = 5 000 FCFA
    const targetCandidate = added.campaign.candidates[1]!;
    const cast = await castCandidateVotes({
      campaignId: campaign.id,
      candidateId: targetCandidate.id,
      votesCount: 25,
      voterName: "Moussa Supporter",
      voterPhone: "+226 70 55 44 33",
      paymentMethod: "ORANGE_MONEY",
    });

    expect(cast.ok).toBe(true);
    if (!cast.ok) return;

    // 25 × 200 = 5 000 FCFA exact payé par le votant, 8 % (400 FCFA) prélevé côté organisateur
    expect(cast.transaction.totalPaidXof).toBe(5000);
    expect(cast.transaction.platformCommissionXof).toBe(400);
    expect(cast.transaction.organizerNetXof).toBe(4600);
    expect(cast.candidate.votesCount).toBe(25);
    expect(cast.transaction.receiptToken.startsWith("VOT-")).toBe(true);

    // Le grand livre du promoteur reflète exactement la recette et la commission 8 %
    const wallet = getOrganizationWallet(org.id);
    expect(wallet.summary.grossSalesXof).toBe(5000);
    expect(wallet.summary.totalCommissionsXof).toBe(400);

    // Le candidat passe #1 du classement
    const ranked = getRankedCandidates(cast.campaign);
    expect(ranked[0]?.id).toBe(targetCandidate.id);

    // Export CSV UTF-8 BOM complet
    const csv = buildVoteCampaignResultsCsv(cast.campaign);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Kadi Visuals");
    expect(csv).toContain("5000");

    // Pause / Clôture bloque les nouveaux votes
    updateVoteCampaignSettings(campaign.id, { status: "PAUSED" });
    const blocked = await castCandidateVotes({
      campaignId: campaign.id,
      candidateId: targetCandidate.id,
      votesCount: 5,
      voterPhone: "+226 70 55 44 33",
      paymentMethod: "WAVE",
    });
    expect(blocked.ok).toBe(false);
  });

  it("sérialise et réhydrate campagnes + votes via cookies signés entre instances serverless (idempotent, anti-altération)", async () => {
    const camp = createVoteCampaign({
      organizationId: "org-vote-elvis",
      title: "Awards Serverless Cross-Lambda",
      shortSummary: "Test complet de persistance cross-lambda sur Vercel.",
      description: "Vérifie qu'une campagne et ses votes survivent d'une instance lambda à une autre.",
      category: "awards",
      countryCode: "CI",
      city: "Abidjan",
      startsAt: "2026-11-23T08:00",
      endsAt: "2026-12-30T23:59",
      unitVotePriceXof: 100,
      candidates: [
        { code: "X01", name: "Artiste Alpha" },
        { code: "X02", name: "Artiste Beta" },
      ],
    });

    const campCookie = serializeSignedVoteCampaigns([camp]);
    expect(campCookie.length).toBeLessThanOrEqual(3700);

    const voteRes = await castCandidateVotes({
      campaignId: camp.id,
      candidateId: camp.candidates[0]!.id,
      votesCount: 10,
      voterPhone: "+225 07 00 11 22 33",
      paymentMethod: "WAVE",
    });
    expect(voteRes.ok).toBe(true);
    if (!voteRes.ok) return;

    const txCookie = serializeSignedVoteTransactions([voteRes.transaction]);

    // Simule une nouvelle instance serverless vide pour cette campagne
    deleteVoteCampaignById(camp.id);
    expect(getVoteCampaignBySlug(camp.slug)).toBeNull();

    // Réhydratation depuis les cookies signés
    const restoredCamps = parseSignedVoteCampaigns(campCookie);
    expect(restoredCamps).toHaveLength(1);
    upsertVoteCampaignInStore(restoredCamps[0]!);

    const restoredTxs = parseSignedVoteTransactions(txCookie);
    expect(restoredTxs).toHaveLength(1);
    // Simule une nouvelle instance lambda froide n'ayant jamais vu cette transaction
    const coldInstanceTx = { ...restoredTxs[0]!, id: "vtx-cold-lambda-check" };
    // Double application doit être idempotente (ne pas doubler les voix !)
    applyVoteTransactionIdempotently(coldInstanceTx);
    applyVoteTransactionIdempotently(coldInstanceTx);

    const loaded = getVoteCampaignBySlug(camp.slug);
    expect(loaded).not.toBeNull();
    expect(loaded?.candidates[0]?.name).toBe("Artiste Alpha");
    expect(loaded?.candidates[0]?.votesCount).toBe(10);
    expect(loaded?.candidates[0]?.grossRaisedXof).toBe(1000);

    // Cookies altérés rejetés
    expect(parseSignedVoteCampaigns(`${campCookie}FAKE`)).toEqual([]);
    expect(parseSignedVoteTransactions(`${txCookie}FAKE`)).toEqual([]);
  });
});
