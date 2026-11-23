import { describe, expect, it } from "vitest";
import {
  parseSignedEventsCookie,
  serializeSignedEventsCookie,
} from "@/modules/events/custom-event-cookie";
import {
  createEventFromDashboard,
  deleteEventById,
  getEventBySlug,
  listEventsForOrganization,
  registerOrganizationInStore,
  upsertEventInStore,
  validateAndCheckinTicket,
} from "@/modules/events/store";
import {
  parseSignedScanSessions,
  serializeSignedScanSessions,
} from "@/modules/operations/scan-session-cookie";
import { createScanSession } from "@/modules/operations/store";
import { signTicketPayload } from "@/modules/tickets/crypto";

describe("Team V1 feedback fixes — isolation, multi-tiers, geo & stateless QR", () => {
  it("isole strictement un nouvel organisateur (0 événement tant qu'il n'a rien publié)", () => {
    const org = registerOrganizationInStore({
      id: "org-elvis-test",
      slug: "elvis-prod-test",
      name: "Elvis Prod Test",
      countryCode: "BF",
      city: "Ouagadougou",
      supportPhone: "+226 70 99 88 77",
      supportEmail: "elvis@example.com",
    });

    expect(listEventsForOrganization(org.id)).toHaveLength(0);

    const created = createEventFromDashboard({
      organizationId: org.id,
      title: "Soirée Afro Multi-Pass",
      shortSummary: "Une soirée incroyable avec Pass Normal, Pass VIP et Pass Or.",
      description: "Concert live avec 3 niveaux de billets et localisation GPS exacte.",
      category: "concert",
      countryCode: "BF",
      city: "Ouagadougou",
      venueName: "Maison du Peuple",
      venueAddress: "Centre-ville, Ouagadougou",
      locationHint: "À côté du grand marché Rood-Woko",
      latitude: 12.3686,
      longitude: -1.5275,
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=12.3686,-1.5275",
      startsAt: "2026-12-26T19:00",
      endsAt: "2026-12-26T23:30",
      tiers: [
        { name: "Pass Normal", priceXof: 3000, totalQty: 200 },
        { name: "Pass VIP", priceXof: 10000, totalQty: 80 },
        { name: "Pass Or", priceXof: 25000, totalQty: 30 },
      ],
    });

    expect(created.feeBearer).toBe("ORGANIZER");
    expect(created.tiers).toHaveLength(3);
    expect(created.tiers.map((t) => t.name)).toEqual(["Pass Normal", "Pass VIP", "Pass Or"]);
    expect(created.locationHint).toBe("À côté du grand marché Rood-Woko");
    expect(created.latitude).toBe(12.3686);
    expect(listEventsForOrganization(org.id)).toHaveLength(1);
  });

  it("valide un QR signé cryptographiquement même émis sur une autre instance serverless et bloque le 2e passage", () => {
    const payload = signTicketPayload({
      ticketId: "tkt-cross-lambda-99",
      eventId: "evt-ouaga-afro-night",
      tierCode: "PASS_VIP",
    });

    const first = validateAndCheckinTicket({
      codeOrPayload: payload,
      expectedEventId: "evt-ouaga-afro-night",
      gateLabel: "Porte VIP",
    });
    expect(first.status).toBe("VALID");

    const second = validateAndCheckinTicket({
      codeOrPayload: payload,
      expectedEventId: "evt-ouaga-afro-night",
      gateLabel: "Porte VIP",
    });
    expect(second.status).toBe("ALREADY_USED");
  });

  it("sérialise et réhydrate un événement personnalisé via cookie signé entre instances serverless (zéro 404)", () => {
    const created = createEventFromDashboard({
      organizationId: "org-elvis-test",
      title: "Concert Test Serverless",
      shortSummary: "Test cross-lambda avec GPS et multi-catégories.",
      description: "Événement de test pour vérifier l'ouverture de la fiche et l'achat sur Vercel.",
      category: "concert",
      countryCode: "BF",
      city: "Ouagadougou",
      venueName: "Palais des Sports",
      venueAddress: "Ouaga 2000",
      locationHint: "Juste après le monument des Martyrs",
      latitude: 12.3112,
      longitude: -1.5018,
      startsAt: "2026-12-28T20:00",
      endsAt: "2026-12-28T23:59",
      tiers: [
        { name: "Pass Normal", priceXof: 5000, totalQty: 100 },
        { name: "Pass VIP", priceXof: 15000, totalQty: 50 },
      ],
    });

    const cookieValue = serializeSignedEventsCookie([created]);
    expect(cookieValue.length).toBeLessThanOrEqual(3700);

    // Simule une autre instance serverless ne contenant pas l'événement en mémoire
    deleteEventById(created.id);
    expect(getEventBySlug(created.slug)).toBeNull();

    // Réhydratation depuis le cookie signé
    const parsed = parseSignedEventsCookie(cookieValue);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.slug).toBe(created.slug);
    expect(parsed[0]?.latitude).toBe(12.3112);
    expect(parsed[0]?.tiers).toHaveLength(2);

    upsertEventInStore(parsed[0]!);
    expect(getEventBySlug(created.slug)?.id).toBe(created.id);

    // Cookie altéré rejeté
    expect(parseSignedEventsCookie(`${cookieValue}TAMPER`)).toEqual([]);
  });

  it("sérialise et réhydrate les codes d'accès agent de porte (GATE-*) via cookie signé", () => {
    const gate = createScanSession({
      eventId: "evt-ouaga-afro-night",
      eventTitle: "La Grande Nuit Afrobeat",
      gateLabel: "Entrée VIP Nord",
      actorName: "Elvis Jethro",
    });

    const cookieVal = serializeSignedScanSessions([gate]);
    const restored = parseSignedScanSessions(cookieVal);
    expect(restored).toHaveLength(1);
    expect(restored[0]?.accessCode).toBe(gate.accessCode);
    expect(restored[0]?.gateLabel).toBe("Entrée VIP Nord");

    // Signature altérée refusée
    expect(parseSignedScanSessions(`${cookieVal}BAD`)).toEqual([]);
  });
});

