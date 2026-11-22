import { describe, expect, it } from "vitest";
import { encodePdfWinAnsi, generateTicketsPdfBuffer } from "@/modules/tickets/pdf";
import { signTicketPayload } from "@/modules/tickets/crypto";
import type { IssuedTicketView } from "@/modules/events/types";

describe("Native Vector Ticket PDF generator", () => {
  it("encode proprement les accents français en WinAnsi sans casser la syntaxe PDF", () => {
    const encoded = encodePdfWinAnsi("Événement d'été (Ouagadougou) — 5\u00A0000 FCFA");
    expect(encoded).toContain("\\311v\\351nement");
    expect(encoded).toContain("\\(Ouagadougou\\)");
    expect(encoded).toContain("5 000 FCFA");
  });

  it("génère un PDF 1.4 multi-pages valide contenant les codes courts et vecteurs QR", () => {
    const t1: IssuedTicketView = {
      id: "tkt-1",
      shortCode: "JVR-8K4P-2M9Q",
      qrPayload: signTicketPayload({
        ticketId: "tkt-1",
        eventId: "evt-1",
        tierCode: "VIP",
        secret: "unit-test-secret-key-at-least-32-characters-long-123456",
      }),
      eventId: "evt-1",
      eventTitle: "La Grande Nuit Afrobeat & Live Band",
      eventSlug: "nuit-afrobeat",
      eventStartsAt: "2026-12-12T19:00:00Z",
      eventCity: "Ouagadougou",
      eventVenue: "Palais des Sports de Ouaga 2000",
      tierId: "tier-vip",
      tierName: "Carré VIP Assis",
      unitPriceXof: 15000,
      attendeeName: "Aminata Ouédraogo",
      status: "VALID",
    };
    const t2: IssuedTicketView = { ...t1, id: "tkt-2", shortCode: "JVR-9R2T-7H3X" };

    const pdf = generateTicketsPdfBuffer([t1, t2], "JVR-ORDER-001");
    const ascii = pdf.toString("latin1");

    expect(ascii.startsWith("%PDF-1.4\n")).toBe(true);
    expect(ascii.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(ascii).toContain("/Count 2");
    expect(ascii).toContain("JVR-8K4P-2M9Q");
    expect(ascii).toContain("JVR-9R2T-7H3X");
    expect(ascii).toContain("JVR-ORDER-001");
    expect(pdf.byteLength).toBeGreaterThan(2000);
  });
});

