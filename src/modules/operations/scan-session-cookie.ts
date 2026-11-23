import crypto from "node:crypto";
import { cookies } from "next/headers";
import { upsertScanSessionInStore, type ScanSessionView } from "./store";

const SCAN_SESSIONS_COOKIE_NAME = "javeroo_scan_sessions";
const MAX_STORED_SESSIONS = 10;
const MAX_COOKIE_CHARS = 3500;

function getCookieSecret(): string {
  return (
    process.env.SESSION_SECRET ??
    process.env.TICKET_SIGNING_SECRET ??
    "dev-session-secret-change-me-in-production-64-chars-javeroo-uemoa"
  );
}

function signPayload(encoded: string): string {
  return crypto
    .createHmac("sha256", getCookieSecret())
    .update(encoded)
    .digest("base64url")
    .slice(0, 32);
}

export function serializeSignedScanSessions(sessions: ScanSessionView[]): string {
  let list = sessions.slice(0, MAX_STORED_SESSIONS);
  while (list.length > 0) {
    const encoded = Buffer.from(JSON.stringify(list), "utf8").toString("base64url");
    const signed = `${encoded}.${signPayload(encoded)}`;
    if (signed.length <= MAX_COOKIE_CHARS || list.length === 1) {
      return signed;
    }
    list = list.slice(0, list.length - 1);
  }
  return "";
}

export function parseSignedScanSessions(rawValue: string | undefined): ScanSessionView[] {
  if (!rawValue) return [];
  const dotIdx = rawValue.lastIndexOf(".");
  if (dotIdx <= 0) return [];
  const encoded = rawValue.slice(0, dotIdx);
  const sig = rawValue.slice(dotIdx + 1);
  const expected = signPayload(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return [];
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
    return Array.isArray(parsed) ? (parsed as ScanSessionView[]) : [];
  } catch {
    return [];
  }
}

export async function readScanSessionsFromCookie(): Promise<ScanSessionView[]> {
  try {
    const store = await cookies();
    const raw = store.get(SCAN_SESSIONS_COOKIE_NAME)?.value;
    return parseSignedScanSessions(raw);
  } catch {
    return [];
  }
}

export async function hydrateScanSessionsIntoStore(): Promise<ScanSessionView[]> {
  const sessions = await readScanSessionsFromCookie();
  for (const s of sessions) {
    upsertScanSessionInStore(s);
  }
  return sessions;
}

export async function buildUpdatedScanSessionsCookie(newSession: ScanSessionView) {
  const existing = await readScanSessionsFromCookie();
  const deduped = [newSession, ...existing.filter((s) => s.id !== newSession.id)];
  const value = serializeSignedScanSessions(deduped);

  return {
    name: SCAN_SESSIONS_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}

export async function buildRevokedScanSessionsCookie(sessionId: string) {
  const existing = await readScanSessionsFromCookie();
  const updated = existing.map((s) => (s.id === sessionId ? { ...s, isRevoked: true } : s));
  const value = serializeSignedScanSessions(updated);

  return {
    name: SCAN_SESSIONS_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: updated.length > 0 ? 60 * 60 * 24 * 14 : 0,
  };
}

