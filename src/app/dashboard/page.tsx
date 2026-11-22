import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { QrCode, Shield, Ticket, Wallet } from "lucide-react";
import { DashboardWorkspace } from "@/components/DashboardWorkspace";
import { PRICING_CONFIG } from "@/config/pricing";
import { formatXof } from "@/config/uemoa";
import { getCurrentSession } from "@/modules/auth/session";
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

  const orgId = session.organizationId ?? "org-faso-scene";
  const orgEvents =
    session.role === "PLATFORM_ADMIN" ? listAllEvents() : listEventsForOrganization(orgId);
  const eventsToDisplay = orgEvents.length > 0 ? orgEvents : listAllEvents();
  const wallet = getOrganizationWallet(orgId);
  const scanSessions = listScanSessions(eventsToDisplay.map((e) => e.id));

  const totalTicketsSold = eventsToDisplay.reduce(
    (sum, evt) => sum + evt.tiers.reduce((tSum, t) => tSum + t.soldQty, 0),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
            Espace Organisateur · {session.organizationName ?? session.fullName}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#1B2A4A]">
            Pilotez vos événements &amp; recettes
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Connecté en tant que <strong>{session.fullName}</strong> ({session.email}) · Reversements
            sous {PRICING_CONFIG.payoutSla.mobileMoneyLabel}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {session.role === "PLATFORM_ADMIN" && (
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

      {/* KPIs issus directement du Grand Livre immuable */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
            <Ticket className="h-4 w-4 text-teal-600" aria-hidden="true" />
            Billets émis
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-[#1B2A4A]">
            {totalTicketsSold.toLocaleString("fr-FR")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Sur {eventsToDisplay.length} événement(s) actif(s)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase">Ventes brutes (Ledger)</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#1B2A4A]">
            {formatXof(wallet.summary.grossSalesXof)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Commissions : {formatXof(wallet.summary.totalCommissionsXof)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase">Retraits engagés / virés</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-700">
            {formatXof(wallet.summary.withdrawnOrHeldXof)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{wallet.payouts.length} demande(s)</p>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-xs">
          <p className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase">
            <Wallet className="h-4 w-4" aria-hidden="true" />
            Disponible au retrait
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
        events={eventsToDisplay}
        walletSummary={wallet.summary}
        ledgerEntries={wallet.entries}
        payouts={wallet.payouts}
        latestKyc={wallet.latestKyc}
        scanSessions={scanSessions}
      />
    </div>
  );
}
