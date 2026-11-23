import { describe, expect, it } from "vitest";
import {
  createEventFromDashboard,
  listEventsForOrganization,
  registerOrganizationInStore,
  validateAndCheckinTicket,
} from "@/modules/events/store";
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
});

