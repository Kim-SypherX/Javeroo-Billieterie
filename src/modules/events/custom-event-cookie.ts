import crypto from "node:crypto";
import { cookies } from "next/headers";
import { upsertEventInStore } from "./store";
import type { EventView } from "./types";

const CUSTOM_EVENTS_COOKIE_NAME = "javeroo_custom_events";
const MAX_STORED_EVENTS = 3;
const MAX_COOKIE_CHARS = 3700;

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

/**
 * Prépare une version compacte de l'événement pour le cookie signé HttpOnly (< 3.7 Ko).
 * Les affiches base64 lourdes (> 400 car.) ne peuvent pas entrer dans un cookie navigateur :
 * elles restent en mémoire de l'instance et les URLs courtes (/uploads/ ou https:// Vercel Blob) sont conservées.
 */
function compactEventForCookie(event: EventView): EventView {
  const safeCover =
    event.coverImageUrl && event.coverImageUrl.length <= 360 ? event.coverImageUrl : undefined;

  return {
    ...event,
    shortSummary: event.shortSummary.slice(0, 180),
    description: event.description.slice(0, 500),
    coverImageUrl: safeCover,
    organizer: {
      ...event.organizer,
      bio: event.organizer.bio.slice(0, 140),
    },
    tiers: event.tiers.slice(0, 8).map((t) => ({
      ...t,
      description: t.description.slice(0, 100),
    })),
  };
}

export function serializeSignedEventsCookie(events: EventView[]): string {
  let list = events.slice(0, MAX_STORED_EVENTS).map(compactEventForCookie);

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

export function parseSignedEventsCookie(rawValue: string | undefined): EventView[] {
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
    return Array.isArray(parsed) ? (parsed as EventView[]) : [];
  } catch {
    return [];
  }
}

export async function readCustomEventsFromCookie(): Promise<EventView[]> {
  try {
    const store = await cookies();
    const raw = store.get(CUSTOM_EVENTS_COOKIE_NAME)?.value;
    return parseSignedEventsCookie(raw);
  } catch {
    return [];
  }
}

/**
 * Réhydrate dans le store en mémoire les événements publiés récemment via le cookie signé.
 * Évite tout 404 entre instances serverless Vercel lors de la création -> affichage -> achat -> scan.
 */
export async function hydrateCustomEventsIntoStore(): Promise<EventView[]> {
  const events = await readCustomEventsFromCookie();
  for (const evt of events) {
    upsertEventInStore(evt);
  }
  return events;
}

export async function buildUpdatedCustomEventsCookie(newEvent: EventView) {
  const existing = await readCustomEventsFromCookie();
  const deduped = [newEvent, ...existing.filter((e) => e.id !== newEvent.id && e.slug !== newEvent.slug)];
  const value = serializeSignedEventsCookie(deduped);

  return {
    name: CUSTOM_EVENTS_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 jours
  };
}

export async function buildCustomEventsCookieWithout(eventId: string) {
  const existing = await readCustomEventsFromCookie();
  const remaining = existing.filter((e) => e.id !== eventId);
  const value = serializeSignedEventsCookie(remaining);

  return {
    name: CUSTOM_EVENTS_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remaining.length > 0 ? 60 * 60 * 24 * 14 : 0,
  };
}

