import crypto from "node:crypto";
import type { UemoaCountryCode } from "@/config/uemoa";
import { hashPassword, verifyPassword } from "./password";
import type { AppUserRole, SessionPayload } from "./session";

export interface AuthUserRecord {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: AppUserRole;
  passwordHash: string;
  organizationId?: string;
  organizationName?: string;
  createdAt: string;
}

declare global {
  var __javerooAuthUsers: AuthUserRecord[] | undefined;
}

function getUsersStore(): AuthUserRecord[] {
  if (!globalThis.__javerooAuthUsers) {
    // Comptes de démonstration pré-chargés en développement (jamais exposés en production)
    globalThis.__javerooAuthUsers =
      process.env.NODE_ENV === "production"
        ? []
        : [
            {
              id: "usr-org-faso",
              email: "organisateur@javeroo.com",
              phone: "+226 70 11 22 33",
              fullName: "Moussa Kaboré",
              role: "ORGANIZER",
              passwordHash: hashPassword("Javeroo2026!"),
              organizationId: "org-faso-scene",
              organizationName: "Faso Scène Productions",
              createdAt: "2026-11-01T10:00:00Z",
            },
            {
              id: "usr-admin-root",
              email: "admin@javeroo.com",
              phone: "+226 70 00 00 01",
              fullName: "Direction Javeroo",
              role: "PLATFORM_ADMIN",
              passwordHash: hashPassword("AdminJaveroo2026!"),
              organizationId: "org-faso-scene",
              organizationName: "Javeroo Plateforme",
              createdAt: "2026-11-01T10:00:00Z",
            },
          ];
  }
  return globalThis.__javerooAuthUsers;
}

export function authenticateUser(
  emailOrPhone: string,
  password: string,
): Omit<SessionPayload, "exp"> | null {
  const norm = emailOrPhone.trim().toLowerCase();
  const cleanPhone = norm.replace(/\s+/g, "");
  const users = getUsersStore();

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === norm ||
      u.phone.toLowerCase().replace(/\s+/g, "") === cleanPhone,
  );
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: user.organizationName,
  };
}

export function registerOrganizerUser(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  organizationName: string;
  countryCode: UemoaCountryCode;
  city: string;
  onOrganizationCreated?: (org: {
    id: string;
    slug: string;
    name: string;
    countryCode: UemoaCountryCode;
    city: string;
    supportPhone: string;
    supportEmail: string;
  }) => void;
}): { ok: true; session: Omit<SessionPayload, "exp"> } | { ok: false; error: string } {
  const users = getUsersStore();
  const emailNorm = input.email.trim().toLowerCase();

  if (users.some((u) => u.email.toLowerCase() === emailNorm)) {
    return { ok: false, error: "Un compte existe déjà avec cette adresse e-mail." };
  }

  const orgId = `org-${crypto.randomBytes(5).toString("hex")}`;
  const baseSlug = input.organizationName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  const orgSlug = `${baseSlug || "organisateur"}-${crypto.randomBytes(2).toString("hex")}`;

  input.onOrganizationCreated?.({
    id: orgId,
    slug: orgSlug,
    name: input.organizationName.trim(),
    countryCode: input.countryCode,
    city: input.city.trim(),
    supportPhone: input.phone.trim(),
    supportEmail: emailNorm,
  });

  const user: AuthUserRecord = {
    id: `usr-${crypto.randomBytes(5).toString("hex")}`,
    email: emailNorm,
    phone: input.phone.trim(),
    fullName: input.fullName.trim(),
    role: "ORGANIZER",
    passwordHash: hashPassword(input.password),
    organizationId: orgId,
    organizationName: input.organizationName.trim(),
    createdAt: new Date().toISOString(),
  };

  users.push(user);

  return {
    ok: true,
    session: {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
    },
  };
}

