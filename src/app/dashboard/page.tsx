import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { QrCode, Shield, Ticket, Wallet } from "lucide-react";
import { DashboardWorkspace } from "@/components/DashboardWorkspace";
import { PRICING_CONFIG } from "@/config/pricing";
import { formatXof } from "@/config/uemoa";
import { getCurrentSession } from "@/modules/auth/session";
import { hydrateCustomEventsIntoStore } from "@/modules/events/custom-event-cookie";
import { listAllEvents, listEventsForOrganization } from "@/modules/events/store";
import { hydrateScanSessionsIntoStore } from "@/modules/operations/scan-session-cookie";
import { getOrganizationWallet, listScanSessions } from "@/modules/operations/store";
import { hydrateVotesIntoStore } from "@/modules/votes/cookie-store";
import {
  listAllVoteCampaigns,
  listVoteCampaignsForOrganization,
} from "@/modules/votes/store";
import { getCampaignGrossXof, getCampaignTotalVotes } from "@/modules/votes/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Espace Organisateur",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    redirect("/connexion?next=/dashboard");
  }

  await hydrateCustomEventsIntoStore();
  await hydrateScanSessionsIntoStore();
  await hydrateVotesIntoStore();

  const isAdmin = session.role === "PLATFORM_ADMIN";
  const orgId = session.organizationId ?? "";

  // Isolation stricte multi-organisateurs :
  // Un promoteur ne voit JAMAIS les événements, votes, codes porte ou chiffres d'un autre promoteur.
  const myEvents = isAdmin ? listAllEvents() : orgId ? listEventsForOrganization(orgId) : [];
  const myVoteCampaigns = isAdmin
    ? listAllVoteCampaigns()
    : orgId
      ? listVoteCampaignsForOrganization(orgId)
      : [];
  const wallet = getOrganizationWallet(orgId);
  const scanSessions = listScanSessions(myEvents.map((e) => e.id));

  const totalTicketsSold = myEvents.reduce(
    (sum, evt) => sum + evt.tiers.reduce((tSum, t) => tSum + t.soldQty, 0),
    0,
  );
  const totalVotesCount = myVoteCampaigns.reduce((sum, c) => sum + getCampaignTotalVotes(c), 0);
  const totalVotesGrossXof = myVoteCampaigns.reduce((sum, c) => sum + getCampaignGrossXof(c), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
            {isAdmin
              ? "Vue globale Administrateur · Javeroo"
              : `Espace Promoteur privé · ${session.organizationName ?? session.fullName}`}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#1B2A4A]">
            Pilotez vos événements &amp; recettes
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Connecté en tant que <strong>{session.fullName}</strong> ({session.email}) ·{" "}
            {isAdmin
              ? "Accès supervision multi-promoteurs."
              : "Vous ne voyez ici que vos propres événements, ventes et retraits."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              Back-office Admin
            </Link>
          )}
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B2A4A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600"
          >
            <QrCode className="h-4 w-4" aria-hidden="true" />
            Ouvrir le contrôle porte
          </Link>
        </div>
      </div>

      {/* KPIs strictement scopés à cet organisateur — grille exacte 2x2 sur mobile (zéro découpe) */}
      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase sm:text-xs">
            <Ticket className="h-3.5 w-3.5 text-teal-600 sm:h-4 sm:w-4" aria-hidden="true" />
            Billets &amp; Voix
          </p>
          <p className="mt-1.5 font-display text-xl font-bold text-[#1B2A4A] sm:mt-2 sm:text-2xl">
            {totalTicketsSold.toLocaleString("fr-FR")}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
            {myEvents.length} év. · <strong>{totalVotesCount.toLocaleString("fr-FR")} voix</strong>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-5">
          <p className="text-[11px] font-bold text-slate-500 uppercase sm:text-xs">Recettes brutes</p>
          <p className="mt-1.5 font-display text-lg font-bold text-[#1B2A4A] sm:mt-2 sm:text-2xl">
            {formatXof(Math.max(wallet.summary.grossSalesXof, totalVotesGrossXof))}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
            Comm. {PRICING_CONFIG.standardCommissionPercent} % :{" "}
            {formatXof(wallet.summary.totalCommissionsXof)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-5">
          <p className="text-[11px] font-bold text-slate-500 uppercase sm:text-xs">Retraits engagés</p>
          <p className="mt-1.5 font-display text-lg font-bold text-slate-700 sm:mt-2 sm:text-2xl">
            {formatXof(wallet.summary.withdrawnOrHeldXof)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">{wallet.payouts.length} demande(s)</p>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3.5 shadow-xs sm:p-5">
          <p className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase">
            <Wallet className="h-4 w-4" aria-hidden="true" />
            Net disponible au retrait
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-[#1B2A4A]">
            {formatXof(wallet.summary.availableForPayoutXof)}
          </p>
          <p className="mt-1 text-xs text-teal-800">
            KYC :{" "}
            <strong>
              {wallet.latestKyc?.status === "APPROVED"
                ? "Validé"
                : wallet.latestKyc?.status === "PENDING"
                  ? "En revue"
                  : "À soumettre"}
            </strong>
          </p>
        </div>
      </div>

      <DashboardWorkspace
        events={myEvents}
        voteCampaigns={myVoteCampaigns}
        isAdmin={isAdmin}
        walletSummary={wallet.summary}
        ledgerEntries={wallet.entries}
        payouts={wallet.payouts}
        latestKyc={wallet.latestKyc}
        scanSessions={scanSessions}
      />
    </div>
  );
}
