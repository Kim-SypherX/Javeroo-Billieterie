import crypto from "node:crypto";
import { cookies } from "next/headers";

export type AppUserRole = "USER" | "ORGANIZER" | "PLATFORM_ADMIN";

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: AppUserRole;
  organizationId?: string;
  organizationName?: string;
  exp: number;
}

export const SESSION_COOKIE_NAME = "javeroo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET ?? process.env.TICKET_SIGNING_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET (>= 32 caractères) est obligatoire en production.");
  }
  return "dev-session-secret-change-me-in-production-64-chars-javeroo-uemoa";
}

export function signSessionToken(
  payload: Omit<SessionPayload, "exp">,
  ttlSeconds = SESSION_TTL_SECONDS,
  secret?: string,
): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret ?? getSessionSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string, secret?: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  const expectedSig = crypto
    .createHmac("sha256", secret ?? getSessionSecret())
    .update(encoded)
    .digest("base64url");

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!parsed.userId || !parsed.role || typeof parsed.exp !== "number") {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function buildSessionCookieConfig(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

