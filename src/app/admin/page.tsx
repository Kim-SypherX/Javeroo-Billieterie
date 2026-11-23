import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  AdminConsole,
  type AdminCategoryStat,
  type AdminCountryStat,
  type AdminOrganizerRow,
  type AdminPlatformKpis,
  type AdminSystemStatus,
} from "@/components/AdminConsole";
import { PRICING_CONFIG } from "@/config/pricing";
import { EVENT_CATEGORY_MAP } from "@/config/site";
import { getCountryByCode } from "@/config/uemoa";
import { getCurrentSession } from "@/modules/auth/session";
import { listConfiguredSuperAdmins } from "@/modules/auth/store";
import { hydrateCustomEventsIntoStore } from "@/modules/events/custom-event-cookie";
import { listAllEvents, listAllOrders, listAllOrganizers } from "@/modules/events/store";
import { listAllAdminOperations } from "@/modules/operations/store";
import { readSignedOrdersFromCookie } from "@/modules/orders/receipt-cookie";

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

  await hydrateCustomEventsIntoStore();

  const ops = listAllAdminOperations();
  const events = listAllEvents();
  const organizers = listAllOrganizers();
  const superAdmins = listConfiguredSuperAdmins();

  // Fusionne les commandes en mémoire et celles du cookie signé de la session courante
  const memoryOrders = listAllOrders();
  const cookieOrders = await readSignedOrdersFromCookie();
  const orderMap = new Map(memoryOrders.map((o) => [o.publicToken, o]));
  for (const co of cookieOrders) {
    if (!orderMap.has(co.publicToken)) {
      orderMap.set(co.publicToken, co);
    }
  }
  const orders = Array.from(orderMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Agrégations globales, par pays UEMOA et par catégorie
  let totalTicketsSold = 0;
  let totalCapacity = 0;
  let totalGrossSalesXof = 0;
  let totalJaverooCommissionXof = 0;

  const countryAcc = new Map<string, AdminCountryStat>();
  const categoryAcc = new Map<string, AdminCategoryStat>();

  for (const evt of events) {
    const evtTickets = evt.tiers.reduce((s, t) => s + t.soldQty, 0);
    const evtCapacity = evt.tiers.reduce((s, t) => s + t.totalQty, 0);
    const evtGross = evt.tiers.reduce((s, t) => s + t.soldQty * t.priceXof, 0);
    const evtCommission = Math.round((evtGross * evt.commissionBps) / 10_000);

    totalTicketsSold += evtTickets;
    totalCapacity += evtCapacity;
    totalGrossSalesXof += evtGross;
    totalJaverooCommissionXof += evtCommission;

    const country = getCountryByCode(evt.countryCode);
    const prevCountry = countryAcc.get(evt.countryCode) ?? {
      countryCode: evt.countryCode,
      countryName: country.name,
      eventsCount: 0,
      ticketsSold: 0,
      grossSalesXof: 0,
      javerooCommissionXof: 0,
    };
    prevCountry.eventsCount += 1;
    prevCountry.ticketsSold += evtTickets;
    prevCountry.grossSalesXof += evtGross;
    prevCountry.javerooCommissionXof += evtCommission;
    countryAcc.set(evt.countryCode, prevCountry);

    const catInfo = EVENT_CATEGORY_MAP[evt.category];
    const prevCat = categoryAcc.get(evt.category) ?? {
      categoryId: evt.category,
      label: catInfo.label,
      eventsCount: 0,
      ticketsSold: 0,
      grossSalesXof: 0,
    };
    prevCat.eventsCount += 1;
    prevCat.ticketsSold += evtTickets;
    prevCat.grossSalesXof += evtGross;
    categoryAcc.set(evt.category, prevCat);
  }

  const countryStats = Array.from(countryAcc.values()).sort(
    (a, b) => b.grossSalesXof - a.grossSalesXof || b.ticketsSold - a.ticketsSold,
  );
  const categoryStats = Array.from(categoryAcc.values()).sort(
    (a, b) => b.grossSalesXof - a.grossSalesXof || b.ticketsSold - a.ticketsSold,
  );

  const pendingKycCount = ops.kycSubmissions.filter((k) => k.status === "PENDING").length;
  const pendingPayouts = ops.payouts.filter((p) => p.status === "REQUESTED");
  const pendingPayoutsAmountXof = pendingPayouts.reduce((s, p) => s + p.amountXof, 0);
  const completedPayoutsAmountXof = ops.payouts
    .filter((p) => p.status === "COMPLETED")
    .reduce((s, p) => s + p.amountXof, 0);

  const kpis: AdminPlatformKpis = {
    totalEvents: events.length,
    featuredEventsCount: events.filter((e) => e.isFeatured).length,
    totalOrganizers: organizers.length,
    verifiedOrganizers: organizers.filter((o) => o.isVerified).length,
    totalTicketsSold,
    totalCapacity,
    averageFillRatePercent:
      totalCapacity > 0 ? Math.min(100, Math.round((totalTicketsSold / totalCapacity) * 100)) : 0,
    totalGrossSalesXof,
    totalJaverooCommissionXof,
    totalOrganizerNetXof: Math.max(0, totalGrossSalesXof - totalJaverooCommissionXof),
    commissionPercent: PRICING_CONFIG.standardCommissionPercent,
    pendingKycCount,
    pendingPayoutsCount: pendingPayouts.length,
    pendingPayoutsAmountXof,
    completedPayoutsAmountXof,
    liveOrdersCount: orders.length,
    activeScanGatesCount: ops.scanSessions.filter((s) => !s.isRevoked).length,
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

  const systemStatus: AdminSystemStatus = {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    region: process.env.VERCEL_REGION ?? "local",
    databaseConfigured: Boolean(process.env.DATABASE_URL?.trim()),
    blobStorageConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
    paymentProvider: (process.env.PAYMENT_PROVIDER ?? "sandbox").toUpperCase(),
    secretsConfigured: Boolean(
      process.env.SESSION_SECRET &&
        process.env.SESSION_SECRET.length >= 32 &&
        process.env.TICKET_SIGNING_SECRET &&
        process.env.TICKET_SIGNING_SECRET.length >= 32,
    ),
    demoAccountsEnabled: process.env.ENABLE_DEMO_ACCOUNTS === "true",
  };

  return (
    <AdminConsole
      currentAdmin={{
        fullName: session.fullName,
        email: session.email,
      }}
      kpis={kpis}
      countryStats={countryStats}
      categoryStats={categoryStats}
      kycSubmissions={ops.kycSubmissions}
      payouts={ops.payouts}
      ledgerEntries={ops.ledgerEntries}
      organizers={organizerRows}
      events={events}
      orders={orders}
      auditLogs={ops.auditLogs}
      superAdmins={superAdmins}
      systemStatus={systemStatus}
    />
  );
}
