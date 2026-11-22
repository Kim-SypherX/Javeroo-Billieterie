import { describe, expect, it } from "vitest";
import {
  generateReadableTicketCode,
  signTicketPayload,
  verifyTicketPayload,
} from "@/modules/tickets/crypto";

describe("QR Ticket cryptography", () => {
  const testSecret = "unit-test-secret-key-at-least-32-characters-long-123456";

  it("signe et valide un payload QR authentique pour le bon événement", () => {
    const payload = signTicketPayload({
      ticketId: "tkt-abc123",
      eventId: "evt-ouaga-01",
      tierCode: "VIP",
      secret: testSecret,
    });

    const result = verifyTicketPayload(payload, {
      expectedEventId: "evt-ouaga-01",
      secret: testSecret,
    });

    expect(result.valid).toBe(true);
    expect(result.claims).toEqual({
      version: "v1",
      ticketId: "tkt-abc123",
      eventId: "evt-ouaga-01",
      tierCode: "VIP",
    });
  });

  it("rejette un payload falsifié (signature invalide)", () => {
    const payload = signTicketPayload({
      ticketId: "tkt-abc123",
      eventId: "evt-ouaga-01",
      tierCode: "NORMAL",
      secret: testSecret,
    });
    const tampered = payload.replace("NORMAL", "VIP");

    const result = verifyTicketPayload(tampered, {
      expectedEventId: "evt-ouaga-01",
      secret: testSecret,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("INVALID_SIGNATURE");
  });

  it("détecte un billet authentique présenté au mauvais événement (WRONG_EVENT)", () => {
    const payload = signTicketPayload({
      ticketId: "tkt-xyz789",
      eventId: "evt-dakar-02",
      tierCode: "PRO",
      secret: testSecret,
    });

    const result = verifyTicketPayload(payload, {
      expectedEventId: "evt-ouaga-01",
      secret: testSecret,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("WRONG_EVENT");
    expect(result.claims?.eventId).toBe("evt-dakar-02");
  });

  it("génère un code court lisible sans caractères ambigus (0/O/1/I)", () => {
    for (let i = 0; i < 30; i++) {
      const code = generateReadableTicketCode();
      expect(code).toMatch(/^JVR-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(code).not.toMatch(/[01OI]/);
    }
  });
});

