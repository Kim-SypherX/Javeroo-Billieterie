import crypto from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PRICING_CONFIG } from "@/config/pricing";
import { calculateOrderPricing } from "@/modules/checkout/pricing";
import { generateReadableTicketCode, signTicketPayload } from "@/modules/tickets/crypto";

/**
 * Transactions PostgreSQL ACID (Drizzle ORM) implémentant les 3 invariants critiques :
 * 1. Réservation atomique du stock (zéro survente même sous forte concurrence)
 * 2. Confirmation idempotente + écriture Grand Livre immuable (append-only)
 * 3. Libération automatique des holds expirés (> 10 min) & check-in atomique anti-doublon
 */

export async function pgCreateOrderWithAtomicHold(params: {
  eventId: string;
  items: ReadonlyArray<{ tierId: string; quantity: number }>;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  promoCode?: string;
}) {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL non configuré pour les transactions PostgreSQL.");
  }

  return db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, params.eventId))
      .limit(1);

    if (!event || event.status !== "PUBLISHED") {
      return { ok: false as const, error: "Événement indisponible à la vente." };
    }

    const pricedInputs: Array<{
      tierId: string;
      tierName: string;
      unitPriceXof: number;
      quantity: number;
    }> = [];

    // 1. Verrouillage atomique du stock sur chaque catégorie demandée
    for (const item of params.items) {
      const [updatedTier] = await tx
        .update(schema.ticketTiers)
        .set({
          reservedQty: sql`${schema.ticketTiers.reservedQty} + ${item.quantity}`,
        })
        .where(
          and(
            eq(schema.ticketTiers.id, item.tierId),
            eq(schema.ticketTiers.eventId, event.id),
            sql`(${schema.ticketTiers.soldQty} + ${schema.ticketTiers.reservedQty} + ${item.quantity}) <= ${schema.ticketTiers.totalQty}`,
          ),
        )
        .returning();

      if (!updatedTier) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      pricedInputs.push({
        tierId: updatedTier.id,
        tierName: updatedTier.name,
        unitPriceXof: updatedTier.priceXof,
        quantity: item.quantity,
      });
    }

    // 2. Vérification éventuelle du code promo
    let promoRecord: typeof schema.promoCodes.$inferSelect | null = null;
    if (params.promoCode) {
      const [foundPromo] = await tx
        .select()
        .from(schema.promoCodes)
        .where(
          and(
            eq(schema.promoCodes.eventId, event.id),
            eq(schema.promoCodes.code, params.promoCode.trim().toUpperCase()),
            eq(schema.promoCodes.isActive, true),
          ),
        )
        .limit(1);
      if (foundPromo && (foundPromo.maxUses === null || foundPromo.usedCount < foundPromo.maxUses)) {
        promoRecord = foundPromo;
      }
    }

    const pricing = calculateOrderPricing({
      items: pricedInputs,
      promo: promoRecord
        ? {
            code: promoRecord.code,
            discountType: promoRecord.discountType,
            discountValue: promoRecord.discountValue,
          }
        : null,
      feeBearer: event.feeBearer,
      commissionBps: event.commissionBps,
    });

    const publicToken = `JVR-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    const expiresAt = new Date(Date.now() + PRICING_CONFIG.checkoutHoldMinutes * 60 * 1000);

    const [order] = await tx
      .insert(schema.orders)
      .values({
        publicToken,
        eventId: event.id,
        buyerName: params.buyerName,
        buyerPhone: params.buyerPhone,
        buyerEmail: params.buyerEmail ?? null,
        promoCodeId: promoRecord?.id ?? null,
        subtotalXof: pricing.subtotalXof,
        discountXof: pricing.discountXof,
        buyerFeeXof: pricing.buyerFeeXof,
        platformCommissionXof: pricing.platformCommissionXof,
        totalXof: pricing.totalToPayXof,
        status: "PENDING",
        expiresAt,
      })
      .returning();

    if (!order) {
      throw new Error("ORDER_CREATION_FAILED");
    }

    for (const line of pricing.items) {
      await tx.insert(schema.orderItems).values({
        orderId: order.id,
        ticketTierId: line.tierId,
        quantity: line.quantity,
        unitPriceXof: line.unitPriceXof,
      });
    }

    return { ok: true as const, order, pricing };
  });
}

export async function pgConfirmOrderPayment(params: {
  orderId: string;
  provider: string;
  providerRef: string;
  method: string;
  rawWebhookPayload?: unknown;
}) {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL non configuré.");
  }

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, params.orderId))
      .limit(1);

    if (!order) {
      return { ok: false as const, error: "Commande introuvable." };
    }

    // Idempotence stricte : si déjà payée, ne jamais ré-émettre de billets ni doubler le ledger
    if (order.status === "PAID") {
      return { ok: true as const, alreadyConfirmed: true };
    }

    const [event] = await tx
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, order.eventId))
      .limit(1);

    if (!event) {
      return { ok: false as const, error: "Événement associé introuvable." };
    }

    const items = await tx
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id));

    for (const item of items) {
      await tx
        .update(schema.ticketTiers)
        .set({
          soldQty: sql`${schema.ticketTiers.soldQty} + ${item.quantity}`,
          reservedQty: sql`GREATEST(0, ${schema.ticketTiers.reservedQty} - ${item.quantity})`,
        })
        .where(eq(schema.ticketTiers.id, item.ticketTierId));

      for (let i = 0; i < item.quantity; i++) {
        const ticketId = crypto.randomUUID();
        const shortCode = generateReadableTicketCode();
        const qrPayload = signTicketPayload({
          ticketId,
          eventId: event.id,
          tierCode: item.ticketTierId.slice(0, 8),
        });
        await tx.insert(schema.tickets).values({
          id: ticketId,
          orderId: order.id,
          eventId: event.id,
          ticketTierId: item.ticketTierId,
          attendeeName: order.buyerName,
          shortCode,
          qrPayload,
          status: "VALID",
        });
      }
    }

    await tx
      .update(schema.orders)
      .set({ status: "PAID", paidAt: new Date() })
      .where(eq(schema.orders.id, order.id));

    await tx
      .insert(schema.payments)
      .values({
        orderId: order.id,
        provider: params.provider,
        providerRef: params.providerRef,
        idempotencyKey: `idem-${order.id}`,
        method: params.method,
        amountXof: order.totalXof,
        status: "SUCCEEDED",
        rawWebhookPayload: params.rawWebhookPayload ?? null,
        verifiedAt: new Date(),
      })
      .onConflictDoNothing({ target: schema.payments.providerRef });

    // Grand Livre comptable append-only
    const netSaleBeforeCommission = order.subtotalXof - order.discountXof;
    if (netSaleBeforeCommission > 0) {
      await tx.insert(schema.ledgerEntries).values({
        organizationId: event.organizationId,
        orderId: order.id,
        entryType: "TICKET_SALE",
        amountXof: netSaleBeforeCommission,
        currency: "XOF",
        availableAt: new Date(),
      });
    }
    if (order.platformCommissionXof > 0 && event.feeBearer === "ORGANIZER") {
      await tx.insert(schema.ledgerEntries).values({
        organizationId: event.organizationId,
        orderId: order.id,
        entryType: "PLATFORM_COMMISSION",
        amountXof: -order.platformCommissionXof,
        currency: "XOF",
        availableAt: new Date(),
      });
    }

    return { ok: true as const, alreadyConfirmed: false };
  });
}

export async function pgReleaseExpiredOrderHolds(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  return db.transaction(async (tx) => {
    const expiredOrders = await tx
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.status, "PENDING"), lt(schema.orders.expiresAt, new Date())));

    for (const ord of expiredOrders) {
      const items = await tx
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, ord.id));

      for (const item of items) {
        await tx
          .update(schema.ticketTiers)
          .set({
            reservedQty: sql`GREATEST(0, ${schema.ticketTiers.reservedQty} - ${item.quantity})`,
          })
          .where(eq(schema.ticketTiers.id, item.ticketTierId));
      }

      await tx
        .update(schema.orders)
        .set({ status: "EXPIRED" })
        .where(eq(schema.orders.id, ord.id));
    }

    return expiredOrders.length;
  });
}

export async function pgRecordAtomicCheckin(params: {
  ticketId: string;
  eventId: string;
  gateLabel: string;
  wasOffline?: boolean;
  deviceId?: string;
}) {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL non configuré.");
  }

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(schema.checkins)
      .values({
        ticketId: params.ticketId,
        eventId: params.eventId,
        gateLabel: params.gateLabel,
        wasOffline: params.wasOffline ?? false,
        deviceId: params.deviceId ?? null,
      })
      .onConflictDoNothing({ target: schema.checkins.ticketId })
      .returning();

    if (!inserted) {
      const [existing] = await tx
        .select()
        .from(schema.checkins)
        .where(eq(schema.checkins.ticketId, params.ticketId))
        .limit(1);
      return { ok: false as const, duplicate: true, existing };
    }

    await tx
      .update(schema.tickets)
      .set({ status: "USED" })
      .where(eq(schema.tickets.id, params.ticketId));

    return { ok: true as const, checkin: inserted };
  });
}

