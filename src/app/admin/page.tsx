import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, QrCode, ShieldCheck } from "lucide-react";
import { AdminConsole, type AdminOrganizerRow, type AdminPlatformKpis } from "@/components/AdminConsole";
import { PRICING_CONFIG } from "@/config/pricing";
import { getCurrentSession } from "@/modules/auth/session";
import { listConfiguredSuperAdmins } from "@/modules/auth/store";
import { listAllEvents, listAllOrganizers } from "@/modules/events/store";
import { listAllAdminOperations } from "@/modules/operations/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SuperAdmin Plateforme Javeroo",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/connexion?next=/admin");
  }
  if (session.role !== "PLATFORM_ADMIN") {
    redirect("/dashboard");
  }

  const ops = listAllAdminOperations();
  const events = listAllEvents();
  const organizers = listAllOrganizers();
  const superAdmins = listConfiguredSuperAdmins();

  // KPIs globaux plateforme (volume brut GMV, commissions Javeroo 8 %, KYC, retraits)
  let totalTicketsSold = 0;
  let totalGrossSalesXof = 0;
  let totalJaverooCommissionXof = 0;

  for (const evt of events) {
    const evtTickets = evt.tiers.reduce((s, t) => s + t.soldQty, 0);
    const evtGross = evt.tiers.reduce((s, t) => s + t.soldQty * t.priceXof, 0);
    const evtCommission = Math.round((evtGross * evt.commissionBps) / 10_000);
    totalTicketsSold += evtTickets;
    totalGrossSalesXof += evtGross;
    totalJaverooCommissionXof += evtCommission;
  }

  const pendingKycCount = ops.kycSubmissions.filter((k) => k.status === "PENDING").length;
  const pendingPayouts = ops.payouts.filter((p) => p.status === "REQUESTED");
  const pendingPayoutsAmountXof = pendingPayouts.reduce((s, p) => s + p.amountXof, 0);

  const kpis: AdminPlatformKpis = {
    totalEvents: events.length,
    totalOrganizers: organizers.length,
    verifiedOrganizers: organizers.filter((o) => o.isVerified).length,
    totalTicketsSold,
    totalGrossSalesXof,
    totalJaverooCommissionXof,
    totalOrganizerNetXof: Math.max(0, totalGrossSalesXof - totalJaverooCommissionXof),
    commissionPercent: PRICING_CONFIG.standardCommissionPercent,
    pendingKycCount,
    pendingPayoutsCount: pendingPayouts.length,
    pendingPayoutsAmountXof,
  };

  const organizerRows: AdminOrganizerRow[] = organizers.map((org) => {
    const orgEvents = events.filter((e) => e.organizerId === org.id);
    const orgTickets = orgEvents.reduce(
      (sum, e) => sum + e.tiers.reduce((s, t) => s + t.soldQty, 0),
      0,
    );
    const orgGross = orgEvents.reduce(
      (sum, e) => sum + e.tiers.reduce((s, t) => s + t.soldQty * t.priceXof, 0),
      0,
    );
    const orgCommission = orgEvents.reduce(
      (sum, e) =>
        sum +
        Math.round(
          (e.tiers.reduce((s, t) => s + t.soldQty * t.priceXof, 0) * e.commissionBps) / 10_000,
        ),
      0,
    );
    const latestKyc = ops.kycSubmissions.find((k) => k.organizationId === org.id);
    return {
      id: org.id,
      slug: org.slug,
      name: org.name,
      city: org.city,
      countryCode: org.countryCode,
      isVerified: org.isVerified,
      supportPhone: org.supportPhone,
      supportEmail: org.supportEmail,
      eventsCount: orgEvents.length,
      ticketsSold: orgTickets,
      grossSalesXof: orgGross,
      javerooCommissionXof: orgCommission,
      kycStatus: latestKyc?.status ?? (org.isVerified ? "APPROVED" : "NONE"),
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-indigo-700 uppercase">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Back-Office SuperAdmin Javeroo · Connecté : {session.fullName} ({session.email})
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#1B2A4A]">
            Supervision Plateforme, Commissions &amp; Gestion déléguée
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pilotez les revenus globaux, validez les KYC et reversements, et publiez des événements
            au nom de vos promoteurs partenaires.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-[#1B2A4A] hover:bg-slate-50"
          >
            <LayoutDashboard className="h-4 w-4 text-teal-600" aria-hidden="true" />
            Vue globale /dashboard
          </Link>
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B2A4A] px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-600"
          >
            <QrCode className="h-4 w-4" aria-hidden="true" />
            Outil Scan porte
          </Link>
        </div>
      </div>

      <AdminConsole
        currentAdminEmail={session.email}
        kpis={kpis}
        kycSubmissions={ops.kycSubmissions}
        payouts={ops.payouts}
        organizers={organizerRows}
        events={events}
        auditLogs={ops.auditLogs}
        superAdmins={superAdmins}
      />
    </div>
  );
}
