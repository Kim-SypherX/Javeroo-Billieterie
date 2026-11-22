import { asc, eq } from "drizzle-orm";
import type { EventCategoryId } from "@/config/site";
import type { UemoaCountryCode } from "@/config/uemoa";
import { getDb, schema } from "@/db";
import { getEventBySlug as devGetEventBySlug, searchEvents as devSearchEvents } from "./store";
import type { CatalogResult, EventFilters, EventView } from "./types";

let cachedPgCheck: { ok: boolean; checkedAt: number } | null = null;

/**
 * Vérifie de manière cachée (15 s) si PostgreSQL est joignable et si les tables migrées existent.
 * Permet une bascule transparente vers PostgreSQL dès que `docker compose up -d && npm run db:push` est lancé.
 */
export async function isPostgresAvailable(): Promise<boolean> {
  if (cachedPgCheck && Date.now() - cachedPgCheck.checkedAt < 15_000) {
    return cachedPgCheck.ok;
  }
  const db = getDb();
  if (!db) {
    cachedPgCheck = { ok: false, checkedAt: Date.now() };
    return false;
  }
  try {
    await db.select({ id: schema.events.id }).from(schema.events).limit(1);
    cachedPgCheck = { ok: true, checkedAt: Date.now() };
    return true;
  } catch {
    cachedPgCheck = { ok: false, checkedAt: Date.now() };
    return false;
  }
}

export async function getUnifiedEventBySlug(slug: string): Promise<EventView | null> {
  if (!(await isPostgresAvailable())) {
    return devGetEventBySlug(slug);
  }
  const db = getDb()!;
  const [evt] = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.slug, slug))
    .limit(1);

  if (!evt) {
    return process.env.NODE_ENV === "production" ? null : devGetEventBySlug(slug);
  }

  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, evt.organizationId))
    .limit(1);

  const tiers = await db
    .select()
    .from(schema.ticketTiers)
    .where(eq(schema.ticketTiers.eventId, evt.id))
    .orderBy(asc(schema.ticketTiers.sortOrder));

  const promos = await db
    .select()
    .from(schema.promoCodes)
    .where(eq(schema.promoCodes.eventId, evt.id));

  return {
    id: evt.id,
    slug: evt.slug,
    title: evt.title,
    shortSummary: evt.shortSummary,
    description: evt.description,
    category: evt.category as EventCategoryId,
    isFeatured: evt.isFeatured,
    countryCode: evt.countryCode as UemoaCountryCode,
    city: evt.city,
    venueName: evt.venueName,
    venueAddress: evt.venueAddress,
    startsAt: evt.startsAt.toISOString(),
    endsAt: evt.endsAt.toISOString(),
    timezone: evt.timezone,
    feeBearer: evt.feeBearer,
    commissionBps: evt.commissionBps,
    coverImageUrl: evt.coverImageKey
      ? evt.coverImageKey.startsWith("/") || evt.coverImageKey.startsWith("http")
        ? evt.coverImageKey
        : `/${evt.coverImageKey}`
      : undefined,
    organizerId: evt.organizationId,
    organizer: {
      id: org?.id ?? evt.organizationId,
      slug: org?.slug ?? "organisateur",
      name: org?.name ?? "Organisateur",
      bio: org?.bio ?? "",
      countryCode: (org?.countryCode ?? evt.countryCode) as UemoaCountryCode,
      city: org?.city ?? evt.city,
      isVerified: org?.kycStatus === "APPROVED",
      supportPhone: org?.supportPhone ?? "",
      supportEmail: org?.supportEmail ?? "",
      accentFrom: "#1B2A4A",
      accentTo: "#0EA5A4",
    },
    tiers: tiers.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      priceXof: t.priceXof,
      totalQty: t.totalQty,
      soldQty: t.soldQty,
      reservedQty: t.reservedQty,
      maxPerOrder: t.maxPerOrder,
    })),
    promoCodes: promos.map((p) => ({
      code: p.code,
      discountType: p.discountType,
      discountValue: p.discountValue,
      maxUses: p.maxUses,
      usedCount: p.usedCount,
      isActive: p.isActive,
    })),
    posterTheme: {
      from: "#1B2A4A",
      via: "#0F4C81",
      to: "#0EA5A4",
      badge: evt.category.toUpperCase(),
      motif: "waves",
    },
  };
}

export async function searchUnifiedCatalog(filters: EventFilters): Promise<CatalogResult> {
  // En mode PostgreSQL actif avec des données, pourra déléguer directement aux index SQL ;
  // assure la cohérence immédiate en dev/staging sans casser si la BDD est vide ou éteinte.
  return devSearchEvents(filters);
}

