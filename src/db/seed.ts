/**
 * Script de seed PostgreSQL pour l'environnement de développement local.
 * Bloqué automatiquement en production pour garantir qu'aucune donnée de test n'y figure.
 */

import { getDb, schema } from "./index";
import { buildSeedEvents, SEED_ORGANIZERS } from "../modules/events/dev-data";

async function seed() {
  if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
    throw new Error("Sécurité : le script db:seed est strictement interdit en production.");
  }

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL manquant. Copiez .env.example vers .env.local et démarrez PostgreSQL.");
  }

  console.log("Seeding organizations...");
  const orgIdMap = new Map<string, string>();

  for (const org of SEED_ORGANIZERS) {
    const [inserted] = await db
      .insert(schema.organizations)
      .values({
        slug: org.slug,
        name: org.name,
        bio: org.bio,
        countryCode: org.countryCode,
        city: org.city,
        supportPhone: org.supportPhone,
        supportEmail: org.supportEmail,
        kycStatus: org.isVerified ? "APPROVED" : "NOT_SUBMITTED",
        verifiedAt: org.isVerified ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: schema.organizations.slug,
        set: { name: org.name, bio: org.bio, updatedAt: new Date() },
      })
      .returning({ id: schema.organizations.id });

    if (inserted) {
      orgIdMap.set(org.id, inserted.id);
    }
  }

  console.log("Seeding events, tiers and promo codes...");
  for (const evt of buildSeedEvents()) {
    const orgUuid = orgIdMap.get(evt.organizerId);
    if (!orgUuid) continue;

    const [insertedEvt] = await db
      .insert(schema.events)
      .values({
        organizationId: orgUuid,
        slug: evt.slug,
        title: evt.title,
        shortSummary: evt.shortSummary,
        description: evt.description,
        category: evt.category,
        status: "PUBLISHED",
        isFeatured: evt.isFeatured,
        countryCode: evt.countryCode,
        city: evt.city,
        venueName: evt.venueName,
        venueAddress: evt.venueAddress,
        startsAt: new Date(evt.startsAt),
        endsAt: new Date(evt.endsAt),
        timezone: evt.timezone,
        feeBearer: evt.feeBearer,
        commissionBps: evt.commissionBps,
        publishedAt: new Date(),
      })
      .onConflictDoNothing({ target: schema.events.slug })
      .returning({ id: schema.events.id });

    if (!insertedEvt) continue;

    for (let idx = 0; idx < evt.tiers.length; idx++) {
      const tier = evt.tiers[idx]!;
      await db.insert(schema.ticketTiers).values({
        eventId: insertedEvt.id,
        name: tier.name,
        description: tier.description,
        priceXof: tier.priceXof,
        totalQty: tier.totalQty,
        soldQty: tier.soldQty,
        reservedQty: 0,
        maxPerOrder: tier.maxPerOrder,
        sortOrder: idx,
      });
    }

    for (const promo of evt.promoCodes) {
      await db
        .insert(schema.promoCodes)
        .values({
          eventId: insertedEvt.id,
          code: promo.code,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          maxUses: promo.maxUses,
          usedCount: promo.usedCount,
          isActive: promo.isActive,
        })
        .onConflictDoNothing();
    }
  }

  console.log("Seed terminé avec succès.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

