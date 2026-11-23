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

function areDemoAccountsEnabled(): boolean {
  if (process.env.ENABLE_DEMO_ACCOUNTS === "true") return true;
  if (process.env.ENABLE_DEMO_ACCOUNTS === "false") return false;
  if (process.env.VERCEL_ENV === "preview") return true;
  return process.env.NODE_ENV !== "production";
}

function getUsersStore(): AuthUserRecord[] {
  if (!globalThis.__javerooAuthUsers) {
    // Comptes de démonstration actifs en local, Vercel Preview ou si ENABLE_DEMO_ACCOUNTS=true
    globalThis.__javerooAuthUsers = !areDemoAccountsEnabled()
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

export interface ConfiguredSuperAdminSummary {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  source: "env" | "demo";
}

interface EnvSuperAdminRecord {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  password: string;
}

function constantTimePasswordEquals(input: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(input, "utf8").digest();
  const b = crypto.createHash("sha256").update(expected, "utf8").digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Charge les comptes SuperAdmin configurés via variables d'environnement Vercel :
 * - SUPER_ADMIN_1_EMAIL / SUPER_ADMIN_1_PASSWORD / SUPER_ADMIN_1_NAME (+ alias ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_NAME)
 * - SUPER_ADMIN_2_EMAIL / SUPER_ADMIN_2_PASSWORD / SUPER_ADMIN_2_NAME (ex. Elvis Jethro)
 * - Jusqu'à SUPER_ADMIN_10_* et/ou SUPER_ADMINS_JSON.
 * Fonctionne en production sans dépendre de ENABLE_DEMO_ACCOUNTS ni de la mémoire d'une instance.
 */
function loadEnvSuperAdmins(): EnvSuperAdminRecord[] {
  const admins: EnvSuperAdminRecord[] = [];
  const seenEmails = new Set<string>();

  const pushAdmin = (entry: {
    id: string;
    email?: string;
    password?: string;
    fullName?: string;
    phone?: string;
  }) => {
    const email = entry.email?.trim().toLowerCase();
    const password = entry.password;
    if (!email || !password || password.length < 8) return;
    if (seenEmails.has(email)) return;
    seenEmails.add(email);
    admins.push({
      id: entry.id,
      email,
      password,
      fullName: entry.fullName?.trim() || "SuperAdmin Javeroo",
      phone: entry.phone?.trim() || "",
    });
  };

  // Format indexé simple pour Vercel (SUPER_ADMIN_1_*, SUPER_ADMIN_2_* ... SUPER_ADMIN_10_*)
  for (let i = 1; i <= 10; i++) {
    const email =
      process.env[`SUPER_ADMIN_${i}_EMAIL`] ?? (i === 1 ? process.env.ADMIN_EMAIL : undefined);
    const password =
      process.env[`SUPER_ADMIN_${i}_PASSWORD`] ?? (i === 1 ? process.env.ADMIN_PASSWORD : undefined);
    const fullName =
      process.env[`SUPER_ADMIN_${i}_NAME`] ??
      (i === 1 ? process.env.ADMIN_NAME : undefined) ??
      `SuperAdmin #${i}`;
    const phone =
      process.env[`SUPER_ADMIN_${i}_PHONE`] ?? (i === 1 ? process.env.ADMIN_PHONE : undefined);

    pushAdmin({
      id: `usr-superadmin-env-${i}`,
      email,
      password,
      fullName,
      phone,
    });
  }

  // Format JSON optionnel (SUPER_ADMINS_JSON='[{"name":"...","email":"...","password":"..."}]')
  const rawJson = process.env.SUPER_ADMINS_JSON?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      if (Array.isArray(parsed)) {
        parsed.forEach((item, idx) => {
          if (item && typeof item === "object") {
            const rec = item as Record<string, unknown>;
            pushAdmin({
              id: `usr-superadmin-json-${idx + 1}`,
              email: typeof rec.email === "string" ? rec.email : undefined,
              password: typeof rec.password === "string" ? rec.password : undefined,
              fullName:
                typeof rec.name === "string"
                  ? rec.name
                  : typeof rec.fullName === "string"
                    ? rec.fullName
                    : undefined,
              phone: typeof rec.phone === "string" ? rec.phone : undefined,
            });
          }
        });
      }
    } catch {
      // JSON invalide ignoré silencieusement pour ne pas bloquer l'authentification
    }
  }

  return admins;
}

export function listConfiguredSuperAdmins(): ConfiguredSuperAdminSummary[] {
  const result: ConfiguredSuperAdminSummary[] = [];
  const seen = new Set<string>();

  for (const envAdmin of loadEnvSuperAdmins()) {
    seen.add(envAdmin.email);
    result.push({
      id: envAdmin.id,
      fullName: envAdmin.fullName,
      email: envAdmin.email,
      phone: envAdmin.phone || undefined,
      source: "env",
    });
  }

  for (const u of getUsersStore()) {
    if (u.role === "PLATFORM_ADMIN" && !seen.has(u.email.toLowerCase())) {
      seen.add(u.email.toLowerCase());
      result.push({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone || undefined,
        source: "demo",
      });
    }
  }

  return result;
}

export function authenticateUser(
  emailOrPhone: string,
  password: string,
): Omit<SessionPayload, "exp"> | null {
  const norm = emailOrPhone.trim().toLowerCase();
  const cleanPhone = norm.replace(/\s+/g, "");

  // 1. Vérifie d'abord les comptes SuperAdmin configurés par variables d'environnement (stateless prod)
  const envAdmins = loadEnvSuperAdmins();
  const matchedEnvAdmin = envAdmins.find(
    (a) =>
      a.email === norm ||
      (a.phone.length > 0 && a.phone.toLowerCase().replace(/\s+/g, "") === cleanPhone),
  );
  if (matchedEnvAdmin) {
    if (!constantTimePasswordEquals(password, matchedEnvAdmin.password)) {
      return null;
    }
    return {
      userId: matchedEnvAdmin.id,
      email: matchedEnvAdmin.email,
      fullName: matchedEnvAdmin.fullName,
      role: "PLATFORM_ADMIN",
      organizationId: "org-javeroo-platform",
      organizationName: "Équipe Javeroo (SuperAdmin)",
    };
  }

  // 2. Ensuite les comptes organisateurs inscrits (et comptes démo si activés)
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

