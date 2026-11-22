import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/modules/auth/password";
import { signSessionToken, verifySessionToken } from "@/modules/auth/session";

describe("Auth password hashing & session tokens", () => {
  const secret = "unit-test-session-secret-key-at-least-32-chars-long-999";

  it("hache un mot de passe avec scrypt + sel unique et vérifie correctement", () => {
    const h1 = hashPassword("Javeroo2026!");
    const h2 = hashPassword("Javeroo2026!");

    expect(h1).not.toBe(h2); // Sel différent à chaque appel
    expect(verifyPassword("Javeroo2026!", h1)).toBe(true);
    expect(verifyPassword("MauvaisMotDePasse", h1)).toBe(false);
    expect(verifyPassword("Javeroo2026!", "invalid-format")).toBe(false);
  });

  it("signe et vérifie un token de session organisateur", () => {
    const token = signSessionToken(
      {
        userId: "usr-1",
        email: "org@javeroo.com",
        fullName: "Moussa Kaboré",
        role: "ORGANIZER",
        organizationId: "org-1",
      },
      3600,
      secret,
    );

    const decoded = verifySessionToken(token, secret);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe("usr-1");
    expect(decoded?.role).toBe("ORGANIZER");
  });

  it("rejette un token altéré ou expiré", () => {
    const validToken = signSessionToken(
      { userId: "usr-1", email: "org@javeroo.com", fullName: "Test", role: "ORGANIZER" },
      3600,
      secret,
    );
    const tampered = `${validToken.slice(0, -4)}AAAA`;
    expect(verifySessionToken(tampered, secret)).toBeNull();

    const expiredToken = signSessionToken(
      { userId: "usr-1", email: "org@javeroo.com", fullName: "Test", role: "ORGANIZER" },
      -10,
      secret,
    );
    expect(verifySessionToken(expiredToken, secret)).toBeNull();
  });
});

