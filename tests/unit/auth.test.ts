import { afterEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/modules/auth/password";
import { signSessionToken, verifySessionToken } from "@/modules/auth/session";
import { authenticateUser, listConfiguredSuperAdmins } from "@/modules/auth/store";

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

describe("Multi-SuperAdmin via variables d'environnement", () => {
  const keys = [
    "SUPER_ADMIN_1_NAME",
    "SUPER_ADMIN_1_EMAIL",
    "SUPER_ADMIN_1_PASSWORD",
    "SUPER_ADMIN_1_PHONE",
    "SUPER_ADMIN_2_NAME",
    "SUPER_ADMIN_2_EMAIL",
    "SUPER_ADMIN_2_PASSWORD",
    "SUPER_ADMIN_2_PHONE",
    "ENABLE_DEMO_ACCOUNTS",
  ] as const;

  const saved: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("authentifie 2 comptes SuperAdmin distincts (fondateur + Elvis Jethro) même avec ENABLE_DEMO_ACCOUNTS=false", () => {
    for (const k of keys) saved[k] = process.env[k];

    process.env.ENABLE_DEMO_ACCOUNTS = "false";
    process.env.SUPER_ADMIN_1_NAME = "Kim — Direction Javeroo";
    process.env.SUPER_ADMIN_1_EMAIL = "kim@javeroo.com";
    process.env.SUPER_ADMIN_1_PASSWORD = "SuperSecretKim2026!";
    process.env.SUPER_ADMIN_1_PHONE = "+226 70 00 00 10";

    process.env.SUPER_ADMIN_2_NAME = "Elvis Jethro";
    process.env.SUPER_ADMIN_2_EMAIL = "elvis@javeroo.com";
    process.env.SUPER_ADMIN_2_PASSWORD = "SuperSecretElvis2026!";
    process.env.SUPER_ADMIN_2_PHONE = "+226 70 00 00 20";

    const kimSession = authenticateUser("kim@javeroo.com", "SuperSecretKim2026!");
    expect(kimSession).not.toBeNull();
    expect(kimSession?.role).toBe("PLATFORM_ADMIN");
    expect(kimSession?.fullName).toBe("Kim — Direction Javeroo");

    // Elvis peut aussi se connecter par son téléphone WhatsApp
    const elvisSession = authenticateUser("+22670000020", "SuperSecretElvis2026!");
    expect(elvisSession).not.toBeNull();
    expect(elvisSession?.role).toBe("PLATFORM_ADMIN");
    expect(elvisSession?.fullName).toBe("Elvis Jethro");
    expect(elvisSession?.email).toBe("elvis@javeroo.com");

    // Mauvais mot de passe refusé
    expect(authenticateUser("elvis@javeroo.com", "MauvaisPasse123")).toBeNull();

    // Liste des SuperAdmins exposée sur /admin sans mot de passe
    const list = listConfiguredSuperAdmins();
    expect(list.some((a) => a.email === "kim@javeroo.com" && a.source === "env")).toBe(true);
    expect(list.some((a) => a.email === "elvis@javeroo.com" && a.source === "env")).toBe(true);
    for (const item of list) {
      expect("password" in item).toBe(false);
      expect("passwordHash" in item).toBe(false);
    }
  });
});

