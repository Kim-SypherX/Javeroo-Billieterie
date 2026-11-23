import crypto from "node:crypto";
import QRCode from "qrcode";
import { PRICING_CONFIG } from "@/config/pricing";
import type { EventCategoryId } from "@/config/site";
import {
  getCountryByCode,
  isUemoaCountryCode,
  type PaymentMethodId,
  type UemoaCountryCode,
} from "@/config/uemoa";
import { calculateOrderPricing } from "@/modules/checkout/pricing";
import { getPaymentGateway } from "@/modules/payments/adapter";
import {
  generateReadableTicketCode,
  signTicketPayload,
  verifyTicketPayload,
} from "@/modules/tickets/crypto";
import { recordOrderInLedger } from "@/modules/operations/store";
import { dispatchOrderTicketNotifications } from "@/modules/notifications/service";
import { buildSeedEvents, SEED_ORGANIZERS } from "./dev-data";
import {
  getEventAvailability,
  getEventMinPriceXof,
  getTierRemaining,
  type CatalogResult,
  type EventFilters,
  type EventView,
  type IssuedTicketView,
  type OrderView,
  type OrganizerView,
  type PromoCodeView,
} from "./types";

interface DevRuntimeState {
  organizers: OrganizerView[];
  events: EventView[];
  orders: OrderView[];
  ticketsByCode: Map<string, IssuedTicketView>;
  ticketsById: Map<string, IssuedTicketView>;
}

declare global {
  var __javerooDevState: DevRuntimeState | undefined;
}

function getState(): DevRuntimeState {
  if (!globalThis.__javerooDevState) {
    const events = buildSeedEvents();
    const state: DevRuntimeState = {
      organizers: [...SEED_ORGANIZERS],
      events,
      orders: [],
      ticketsByCode: new Map(),
      ticketsById: new Map(),
    };

    // Billet de démonstration pré-signé pour tester immédiatement /scan sans créer de commande
    const firstEvent = events[0];
    const firstTier = firstEvent?.tiers[1];
    if (firstEvent && firstTier) {
      const demoTicketId = "tkt-demo-001";
      const demoCode = "JVR-DEMO-2026";
      const demoQr = signTicketPayload({
        ticketId: demoTicketId,
        eventId: firstEvent.id,
        tierCode: "NORMAL",
      });
      const demoTicket: IssuedTicketView = {
        id: demoTicketId,
        shortCode: demoCode,
        qrPayload: demoQr,
        eventId: firstEvent.id,
        eventTitle: firstEvent.title,
        eventSlug: firstEvent.slug,
        eventStartsAt: firstEvent.startsAt,
        eventCity: firstEvent.city,
        eventVenue: firstEvent.venueName,
        tierId: firstTier.id,
        tierName: firstTier.name,
        unitPriceXof: firstTier.priceXof,
        attendeeName: "Aminata Ouédraogo",
        status: "VALID",
      };
      state.ticketsByCode.set(demoCode, demoTicket);
      state.ticketsById.set(demoTicketId, demoTicket);
    }

    globalThis.__javerooDevState = state;
  }
  return globalThis.__javerooDevState;
}

export function listFeaturedEvents(limit = 4): EventView[] {
  const { events } = getState();
  return events
    .filter((e) => e.isFeatured)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, limit);
}

export function listAllEvents(): EventView[] {
  return [...getState().events];
}

export function getPlatformPublicStats() {
  const { events, organizers, orders } = getState();
  const baseSold = events.reduce(
    (sum, evt) => sum + evt.tiers.reduce((tSum, t) => tSum + t.soldQty, 0),
    0,
  );
  return {
    eventsCount: events.length,
    organizersCount: organizers.length,
    ticketsIssued: baseSold + orders.reduce((s, o) => s + o.tickets.length, 0),
    countriesCount: 8,
  };
}

export function searchEvents(filters: EventFilters): CatalogResult {
  const { events } = getState();
  const now = new Date();

  const matchingCountryEvents =
    filters.pays && isUemoaCountryCode(filters.pays)
      ? events.filter((e) => e.countryCode === filters.pays)
      : events;

  const availableCities = Array.from(new Set(matchingCountryEvents.map((e) => e.city))).sort(
    (a, b) => a.localeCompare(b, "fr"),
  );

  let filtered = [...matchingCountryEvents];

  if (filters.ville && filters.ville !== "all") {
    const cityNorm = filters.ville.toLowerCase();
    filtered = filtered.filter((e) => e.city.toLowerCase() === cityNorm);
  }

  if (filters.categorie && filters.categorie !== "all") {
    filtered = filtered.filter((e) => e.category === filters.categorie);
  }

  if (filters.prix === "free") {
    filtered = filtered.filter((e) => getEventMinPriceXof(e) === 0);
  } else if (filters.prix === "paid") {
    filtered = filtered.filter((e) => getEventMinPriceXof(e) > 0);
  }

  if (filters.periode && filters.periode !== "all") {
    filtered = filtered.filter((e) => {
      const start = new Date(e.startsAt);
      const diffDays = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (filters.periode === "today") return diffDays >= -0.5 && diffDays <= 1;
      if (filters.periode === "weekend") return diffDays >= 0 && diffDays <= 10;
      if (filters.periode === "month") return diffDays >= 0 && diffDays <= 35;
      return true;
    });
  }

  if (filters.q && filters.q.trim().length > 0) {
    const query = filters.q
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    filtered = filtered.filter((e) => {
      const haystack = `${e.title} ${e.shortSummary} ${e.city} ${e.venueName} ${e.organizer.name}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return haystack.includes(query);
    });
  }

  if (filters.tri === "price_asc") {
    filtered.sort((a, b) => getEventMinPriceXof(a) - getEventMinPriceXof(b));
  } else if (filters.tri === "popular") {
    filtered.sort(
      (a, b) => getEventAvailability(b).soldQty - getEventAvailability(a).soldQty,
    );
  } else {
    filtered.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  const pageSize = Math.max(1, Math.min(24, filters.pageSize ?? 6));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(totalPages, filters.page ?? 1));
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
    availableCities,
  };
}

export function getEventBySlug(slug: string): EventView | null {
  return getState().events.find((e) => e.slug === slug) ?? null;
}

export function getEventById(id: string): EventView | null {
  return getState().events.find((e) => e.id === id) ?? null;
}

export function getOrganizerBySlug(
  slug: string,
): { organizer: OrganizerView; events: EventView[] } | null {
  const { organizers, events } = getState();
  const organizer = organizers.find((o) => o.slug === slug);
  if (!organizer) return null;
  const orgEvents = events
    .filter((e) => e.organizerId === organizer.id)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return { organizer, events: orgEvents };
}

export function validateEventPromoCode(
  eventId: string,
  rawCode: string,
): { valid: boolean; promo?: PromoCodeView; message: string } {
  const event = getEventById(eventId);
  if (!event) {
    return { valid: false, message: "Événement introuvable." };
  }
  const normalized = rawCode.trim().toUpperCase();
  const promo = event.promoCodes.find((p) => p.code.toUpperCase() === normalized);
  if (!promo || !promo.isActive) {
    return { valid: false, message: "Ce code promo n'est pas valide pour cet événement." };
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { valid: false, message: "Ce code promo a atteint sa limite d'utilisations." };
  }
  return {
    valid: true,
    promo,
    message:
      promo.discountType === "PERCENTAGE"
        ? `Code appliqué : −${promo.discountValue} % sur votre commande.`
        : `Code appliqué : −${promo.discountValue.toLocaleString("fr-FR")} FCFA sur votre commande.`,
  };
}

export async function createCheckoutOrder(params: {
  eventId: string;
  items: ReadonlyArray<{ tierId: string; quantity: number }>;
  promoCode?: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  paymentMethod: PaymentMethodId;
}): Promise<{ ok: true; order: OrderView } | { ok: false; error: string }> {
  const state = getState();
  const event = state.events.find((e) => e.id === params.eventId);
  if (!event) {
    return { ok: false, error: "Événement introuvable." };
  }

  const resolvedItems: Array<{
    tierId: string;
    tierName: string;
    unitPriceXof: number;
    quantity: number;
  }> = [];

  for (const reqItem of params.items) {
    if (reqItem.quantity <= 0) continue;
    const tier = event.tiers.find((t) => t.id === reqItem.tierId);
    if (!tier) {
      return { ok: false, error: "Catégorie de billet introuvable." };
    }
    if (reqItem.quantity > tier.maxPerOrder) {
      return {
        ok: false,
        error: `Maximum ${tier.maxPerOrder} billets autorisés par commande pour "${tier.name}".`,
      };
    }
    const remaining = getTierRemaining(tier);
    if (reqItem.quantity > remaining) {
      return {
        ok: false,
        error: `Stock insuffisant pour "${tier.name}" (${remaining} place(s) restante(s)).`,
      };
    }
    resolvedItems.push({
      tierId: tier.id,
      tierName: tier.name,
      unitPriceXof: tier.priceXof,
      quantity: reqItem.quantity,
    });
  }

  if (resolvedItems.length === 0) {
    return { ok: false, error: "Sélectionnez au moins un billet." };
  }

  let appliedPromo: PromoCodeView | null = null;
  if (params.promoCode && params.promoCode.trim().length > 0) {
    const check = validateEventPromoCode(event.id, params.promoCode);
    if (!check.valid || !check.promo) {
      return { ok: false, error: check.message };
    }
    appliedPromo = check.promo;
  }

  const pricing = calculateOrderPricing({
    items: resolvedItems,
    promo: appliedPromo,
    feeBearer: event.feeBearer,
    commissionBps: event.commissionBps,
  });

  const orderId = `ord-${crypto.randomBytes(6).toString("hex")}`;
  const publicToken = `JVR-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;

  // Déclenchement paiement via l'Adapter PSP (sandbox en dev)
  let providerRef = `FREE-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  if (pricing.totalToPayXof > 0) {
    const gateway = getPaymentGateway();
    const init = await gateway.initiatePayment({
      orderId,
      idempotencyKey: `idem-${orderId}`,
      amountXof: pricing.totalToPayXof,
      countryCode: event.countryCode,
      method: params.paymentMethod,
      customerPhone: params.buyerPhone,
      customerName: params.buyerName,
      description: `Billets ${event.title}`,
    });
    const verified = await gateway.verifyTransaction(init.providerRef, pricing.totalToPayXof);
    if (verified.status !== "SUCCEEDED") {
      return { ok: false, error: "Le paiement n'a pas pu être confirmé. Aucun débit effectué." };
    }
    providerRef = init.providerRef;
  }

  // Décrémentation atomique du stock et émission des billets signés
  for (const item of resolvedItems) {
    const tier = event.tiers.find((t) => t.id === item.tierId);
    if (tier) {
      tier.soldQty += item.quantity;
    }
  }
  if (appliedPromo) {
    appliedPromo.usedCount += 1;
  }

  const tickets: IssuedTicketView[] = [];
  for (const item of resolvedItems) {
    for (let i = 0; i < item.quantity; i++) {
      const ticketId = `tkt-${crypto.randomBytes(6).toString("hex")}`;
      const shortCode = generateReadableTicketCode();
      const qrPayload = signTicketPayload({
        ticketId,
        eventId: event.id,
        tierCode: item.tierName.toUpperCase().slice(0, 12),
      });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 240,
        margin: 1,
        color: { dark: "#1B2A4A", light: "#FFFFFF" },
      });

      const issued: IssuedTicketView = {
        id: ticketId,
        shortCode,
        qrPayload,
        qrDataUrl,
        eventId: event.id,
        eventTitle: event.title,
        eventSlug: event.slug,
        eventStartsAt: event.startsAt,
        eventCity: event.city,
        eventVenue: event.venueName,
        tierId: item.tierId,
        tierName: item.tierName,
        unitPriceXof: item.unitPriceXof,
        attendeeName: params.buyerName,
        status: "VALID",
      };
      tickets.push(issued);
      state.ticketsByCode.set(shortCode, issued);
      state.ticketsById.set(ticketId, issued);
    }
  }

  const nowIso = new Date().toISOString();
  const order: OrderView = {
    id: orderId,
    publicToken,
    eventId: event.id,
    eventSlug: event.slug,
    eventTitle: event.title,
    eventStartsAt: event.startsAt,
    eventCity: event.city,
    eventVenue: event.venueName,
    countryCode: event.countryCode,
    buyerName: params.buyerName,
    buyerPhone: params.buyerPhone,
    buyerEmail: params.buyerEmail,
    promoCodeApplied: appliedPromo?.code,
    paymentMethod: params.paymentMethod,
    paymentProviderRef: providerRef,
    subtotalXof: pricing.subtotalXof,
    discountXof: pricing.discountXof,
    buyerFeeXof: pricing.buyerFeeXof,
    platformCommissionXof: pricing.platformCommissionXof,
    totalToPayXof: pricing.totalToPayXof,
    organizerNetXof: pricing.organizerNetXof,
    status: "PAID",
    createdAt: nowIso,
    paidAt: nowIso,
    tickets,
  };

  state.orders.unshift(order);

  recordOrderInLedger({
    organizationId: event.organizerId,
    orderId: order.id,
    eventTitle: event.title,
    netAfterDiscountXof: pricing.netAfterDiscountXof,
    platformCommissionXof: pricing.platformCommissionXof,
    feeBearer: event.feeBearer,
  });

  // Envoi non bloquant des notifications WhatsApp + E-mail
  void dispatchOrderTicketNotifications(order);

  return { ok: true, order };
}

export async function getOrderByToken(publicToken: string): Promise<OrderView | null> {
  const order = getState().orders.find((o) => o.publicToken === publicToken) ?? null;
  if (!order) return null;
  // Assure la présence des QR DataURLs
  for (const t of order.tickets) {
    if (!t.qrDataUrl) {
      t.qrDataUrl = await QRCode.toDataURL(t.qrPayload, {
        width: 240,
        margin: 1,
        color: { dark: "#1B2A4A", light: "#FFFFFF" },
      });
    }
  }
  return order;
}

export function findOrdersByContact(contact: string): OrderView[] {
  const cleaned = contact.trim().toLowerCase().replace(/\s+/g, "");
  if (cleaned.length < 4) return [];
  return getState().orders.filter((o) => {
    const phoneNorm = o.buyerPhone.toLowerCase().replace(/\s+/g, "");
    const emailNorm = (o.buyerEmail ?? "").toLowerCase().trim();
    return phoneNorm.includes(cleaned) || (emailNorm.length > 0 && emailNorm === cleaned);
  });
}

export type CheckinOutcome =
  | {
      status: "VALID";
      message: string;
      ticket: IssuedTicketView;
    }
  | {
      status: "ALREADY_USED";
      message: string;
      ticket: IssuedTicketView;
    }
  | {
      status: "WRONG_EVENT";
      message: string;
      ticket?: IssuedTicketView;
    }
  | {
      status: "INVALID";
      message: string;
    };

export function validateAndCheckinTicket(params: {
  codeOrPayload: string;
  expectedEventId: string;
  gateLabel: string;
}): CheckinOutcome {
  const state = getState();
  const input = params.codeOrPayload.trim();
  if (!input) {
    return { status: "INVALID", message: "Veuillez scanner un QR code ou saisir un code billet." };
  }

  let ticket: IssuedTicketView | undefined;

  if (input.startsWith("v1.")) {
    const verification = verifyTicketPayload(input, { expectedEventId: params.expectedEventId });
    if (!verification.valid) {
      if (verification.reason === "WRONG_EVENT") {
        const matched = verification.claims
          ? state.ticketsById.get(verification.claims.ticketId)
          : undefined;
        return {
          status: "WRONG_EVENT",
          message: matched
            ? `Ce billet appartient à un autre événement : "${matched.eventTitle}".`
            : "Ce billet est authentique mais appartient à un autre événement.",
          ticket: matched,
        };
      }
      return {
        status: "INVALID",
        message: "Signature cryptographique invalide : ce QR code est falsifié ou illisible.",
      };
    }
    ticket = verification.claims ? state.ticketsById.get(verification.claims.ticketId) : undefined;
    if (!ticket && verification.claims) {
      // Vérification cryptographique stateless réussie (ex. billet émis sur une autre instance serverless Vercel)
      const matchedEvent = state.events.find((e) => e.id === verification.claims?.eventId);
      const syntheticTicket: IssuedTicketView = {
        id: verification.claims.ticketId,
        shortCode: `QR-${verification.claims.ticketId.slice(-6).toUpperCase()}`,
        qrPayload: input,
        eventId: verification.claims.eventId,
        eventTitle: matchedEvent?.title ?? "Événement vérifié",
        eventSlug: matchedEvent?.slug ?? "",
        eventStartsAt: matchedEvent?.startsAt ?? new Date().toISOString(),
        eventCity: matchedEvent?.city ?? "",
        eventVenue: matchedEvent?.venueName ?? "",
        tierId: verification.claims.tierCode,
        tierName: verification.claims.tierCode,
        unitPriceXof: 0,
        attendeeName: "Titulaire vérifié (QR signé)",
        status: "USED",
        checkedInAt: new Date().toISOString(),
        checkedInGate: params.gateLabel || "Entrée Principale",
      };
      state.ticketsById.set(syntheticTicket.id, syntheticTicket);
      return {
        status: "VALID",
        message: "Signature cryptographique authentique — Entrée validée !",
        ticket: syntheticTicket,
      };
    }
    if (!ticket) {
      return {
        status: "INVALID",
        message: "Billet introuvable dans le registre de cet événement.",
      };
    }
  } else {
    ticket = state.ticketsByCode.get(input.toUpperCase());
    if (!ticket) {
      return {
        status: "INVALID",
        message: `Aucun billet trouvé pour le code "${input.toUpperCase()}".`,
      };
    }
    if (ticket.eventId !== params.expectedEventId) {
      return {
        status: "WRONG_EVENT",
        message: `Ce billet appartient à un autre événement : "${ticket.eventTitle}".`,
        ticket,
      };
    }
  }

  if (ticket.status === "USED") {
    return {
      status: "ALREADY_USED",
      message: `Billet déjà scanné le ${new Date(ticket.checkedInAt ?? "").toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} à "${ticket.checkedInGate ?? "Porte"}".`,
      ticket,
    };
  }

  if (ticket.status === "REVOKED") {
    return { status: "INVALID", message: "Ce billet a été annulé ou remboursé." };
  }

  ticket.status = "USED";
  ticket.checkedInAt = new Date().toISOString();
  ticket.checkedInGate = params.gateLabel || "Entrée Principale";

  return {
    status: "VALID",
    message: "Entrée validée avec succès !",
    ticket,
  };
}

export function createEventFromDashboard(input: {
  organizationId?: string;
  title: string;
  shortSummary: string;
  description: string;
  category: EventCategoryId;
  countryCode: UemoaCountryCode;
  city: string;
  venueName: string;
  venueAddress: string;
  locationHint?: string;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  coverImageUrl?: string;
  startsAt: string;
  endsAt: string;
  tiers: ReadonlyArray<{
    name: string;
    description?: string;
    priceXof: number;
    totalQty: number;
  }>;
  promoCode?: string;
  promoPercent?: number;
}): EventView {
  const state = getState();
  const organizer =
    (input.organizationId
      ? state.organizers.find((o) => o.id === input.organizationId)
      : undefined) ?? state.organizers[0]!;
  const country = getCountryByCode(input.countryCode);
  const baseSlug = input.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  const slug = `${baseSlug || "evenement"}-${crypto.randomBytes(2).toString("hex")}`;
  const id = `evt-${crypto.randomBytes(5).toString("hex")}`;

  const promoCodes: PromoCodeView[] =
    input.promoCode && input.promoPercent && input.promoPercent > 0
      ? [
          {
            code: input.promoCode.trim().toUpperCase(),
            discountType: "PERCENTAGE",
            discountValue: Math.min(90, input.promoPercent),
            maxUses: 100,
            usedCount: 0,
            isActive: true,
          },
        ]
      : [];

  const normalizedTiers = input.tiers.map((t) => ({
    id: `tier-${crypto.randomBytes(4).toString("hex")}`,
    name: t.name.trim() || "Pass Normal",
    description: t.description?.trim() || "Billet avec QR code sécurisé à usage unique.",
    priceXof: Math.max(0, Math.round(t.priceXof)),
    totalQty: Math.max(1, Math.round(t.totalQty)),
    soldQty: 0,
    reservedQty: 0,
    maxPerOrder: 10,
  }));

  const newEvent: EventView = {
    id,
    slug,
    title: input.title.trim(),
    shortSummary: input.shortSummary.trim(),
    description: input.description.trim(),
    category: input.category,
    isFeatured: false,
    countryCode: input.countryCode,
    city: input.city.trim(),
    venueName: input.venueName.trim(),
    venueAddress: input.venueAddress.trim(),
    locationHint: input.locationHint?.trim() || undefined,
    latitude: input.latitude,
    longitude: input.longitude,
    mapsUrl: input.mapsUrl?.trim() || undefined,
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: new Date(input.endsAt).toISOString(),
    timezone: country.timezone,
    feeBearer: "ORGANIZER",
    commissionBps: PRICING_CONFIG.standardCommissionBps,
    coverImageUrl: input.coverImageUrl,
    organizerId: organizer.id,
    organizer,
    tiers: normalizedTiers,
    promoCodes,
    posterTheme: {
      from: "#1B2A4A",
      via: "#0F4C81",
      to: "#0EA5A4",
      badge: "NOUVEL ÉVÉNEMENT",
      motif: "waves",
    },
  };

  state.events.unshift(newEvent);
  return newEvent;
}

export function getDashboardSummary() {
  const { events, orders } = getState();
  const totalSalesXof =
    events.reduce(
      (sum, evt) =>
        sum + evt.tiers.reduce((s, t) => s + t.soldQty * t.priceXof, 0),
      0,
    );
  const totalTicketsSold = events.reduce(
    (sum, evt) => sum + evt.tiers.reduce((s, t) => s + t.soldQty, 0),
    0,
  );
  const estimatedCommissionXof = Math.round(
    (totalSalesXof * PRICING_CONFIG.standardCommissionBps) / 10_000,
  );
  return {
    eventsCount: events.length,
    totalTicketsSold,
    totalSalesXof,
    estimatedCommissionXof,
    netAvailableXof: Math.max(0, totalSalesXof - estimatedCommissionXof),
    recentOrders: orders.slice(0, 8),
  };
}

export function registerOrganizationInStore(org: {
  id: string;
  slug: string;
  name: string;
  countryCode: UemoaCountryCode;
  city: string;
  supportPhone: string;
  supportEmail: string;
}): OrganizerView {
  const state = getState();
  const existing = state.organizers.find((o) => o.id === org.id);
  if (existing) return existing;
  const created: OrganizerView = {
    ...org,
    bio: `Organisateur d'événements basé à ${org.city}.`,
    isVerified: false,
    accentFrom: "#1B2A4A",
    accentTo: "#0EA5A4",
  };
  state.organizers.push(created);
  return created;
}

export function markOrganizationVerified(organizationId: string): void {
  const state = getState();
  const org = state.organizers.find((o) => o.id === organizationId);
  if (org) {
    org.isVerified = true;
  }
}

export function listTicketsForEvent(eventId: string): IssuedTicketView[] {
  const { ticketsById } = getState();
  const list: IssuedTicketView[] = [];
  for (const ticket of ticketsById.values()) {
    if (ticket.eventId === eventId) {
      list.push(ticket);
    }
  }
  return list;
}

export function registerIssuedTicket(ticket: IssuedTicketView): void {
  const state = getState();
  state.ticketsByCode.set(ticket.shortCode, ticket);
  state.ticketsById.set(ticket.id, ticket);
}

export function toggleEventFeaturedFlag(eventId: string): EventView | null {
  const event = getState().events.find((e) => e.id === eventId);
  if (!event) return null;
  event.isFeatured = !event.isFeatured;
  return event;
}

export function listEventsForOrganization(organizationId: string): EventView[] {
  return getState().events.filter((e) => e.organizerId === organizationId);
}

export function listAllOrganizers(): OrganizerView[] {
  return [...getState().organizers];
}


