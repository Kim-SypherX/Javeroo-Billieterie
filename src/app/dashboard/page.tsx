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
import { getOrganizationWallet, listScanSessions } from "@/modules/operations/store";

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

  const isAdmin = session.role === "PLATFORM_ADMIN";
  const orgId = session.organizationId ?? "";

  // Isolation stricte multi-organisateurs :
  // Un promoteur ne voit JAMAIS les événements, ventes, codes porte ou chiffres d'un autre promoteur.
  const myEvents = isAdmin ? listAllEvents() : orgId ? listEventsForOrganization(orgId) : [];
  const wallet = getOrganizationWallet(orgId);
  const scanSessions = listScanSessions(myEvents.map((e) => e.id));

  const totalTicketsSold = myEvents.reduce(
    (sum, evt) => sum + evt.tiers.reduce((tSum, t) => tSum + t.soldQty, 0),
    0,
  );

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

      {/* KPIs strictement scopés à cet organisateur */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
            <Ticket className="h-4 w-4 text-teal-600" aria-hidden="true" />
            Vos billets vendus
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-[#1B2A4A]">
            {totalTicketsSold.toLocaleString("fr-FR")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Sur {myEvents.length} événement{myEvents.length > 1 ? "s" : ""} créé
            {myEvents.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase">Vos recettes brutes</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#1B2A4A]">
            {formatXof(wallet.summary.grossSalesXof)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Commission Javeroo ({PRICING_CONFIG.standardCommissionPercent} %) :{" "}
            {formatXof(wallet.summary.totalCommissionsXof)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase">Vos retraits engagés</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-700">
            {formatXof(wallet.summary.withdrawnOrHeldXof)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{wallet.payouts.length} demande(s)</p>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-xs">
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
        walletSummary={wallet.summary}
        ledgerEntries={wallet.entries}
        payouts={wallet.payouts}
        latestKyc={wallet.latestKyc}
        scanSessions={scanSessions}
      />
    </div>
  );
}
