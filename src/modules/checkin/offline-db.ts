/**
 * Base locale IndexedDB pour le contrôle d'accès porte hors-ligne (/scan).
 * Permet de charger le manifeste d'un événement avant l'ouverture des portes,
 * de contrôler les QR codes et codes courts même en mode avion, d'empêcher les doublons
 * localement et de synchroniser automatiquement dès le retour du réseau.
 */

export interface OfflineManifestTicket {
  shortCode: string;
  ticketId: string;
  eventId: string;
  eventTitle: string;
  tierName: string;
  attendeeName: string;
  qrPayload: string;
  status: "VALID" | "USED" | "REVOKED";
  checkedInAt?: string;
  checkedInGate?: string;
}

export interface PendingOfflineCheckin {
  id: string;
  shortCode: string;
  qrPayload: string;
  eventId: string;
  gateLabel: string;
  scannedAt: string;
}

const DB_NAME = "javeroo-scan-offline-v1";
const DB_VERSION = 1;
const STORE_TICKETS = "manifest_tickets";
const STORE_PENDING = "pending_checkins";

function openScanDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB non supporté sur ce navigateur."));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TICKETS)) {
        const store = db.createObjectStore(STORE_TICKETS, { keyPath: "shortCode" });
        store.createIndex("by_event", "eventId", { unique: false });
        store.createIndex("by_payload", "qrPayload", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveEventManifestOffline(
  eventId: string,
  tickets: OfflineManifestTicket[],
): Promise<number> {
  const db = await openScanDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, "readwrite");
    const store = tx.objectStore(STORE_TICKETS);
    for (const ticket of tickets) {
      store.put({ ...ticket, eventId });
    }
    tx.oncomplete = () => resolve(tickets.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function countCachedTicketsForEvent(eventId: string): Promise<number> {
  const db = await openScanDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, "readonly");
    const idx = tx.objectStore(STORE_TICKETS).index("by_event");
    const req = idx.count(eventId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listPendingOfflineCheckins(): Promise<PendingOfflineCheckin[]> {
  const db = await openScanDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, "readonly");
    const req = tx.objectStore(STORE_PENDING).getAll();
    req.onsuccess = () => resolve((req.result as PendingOfflineCheckin[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function removePendingOfflineCheckins(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openScanDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, "readwrite");
    const store = tx.objectStore(STORE_PENDING);
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function verifyAndCheckinOffline(params: {
  codeOrPayload: string;
  expectedEventId: string;
  gateLabel: string;
}): Promise<
  | { status: "VALID"; message: string; ticket: OfflineManifestTicket }
  | { status: "ALREADY_USED"; message: string; ticket: OfflineManifestTicket }
  | { status: "WRONG_EVENT"; message: string; ticket?: OfflineManifestTicket }
  | { status: "INVALID"; message: string }
> {
  const db = await openScanDb();
  const raw = params.codeOrPayload.trim();

  const ticket = await new Promise<OfflineManifestTicket | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, "readonly");
    const store = tx.objectStore(STORE_TICKETS);
    if (raw.startsWith("v1.")) {
      const req = store.index("by_payload").get(raw);
      req.onsuccess = () => resolve(req.result as OfflineManifestTicket | undefined);
      req.onerror = () => reject(req.error);
    } else {
      const req = store.get(raw.toUpperCase());
      req.onsuccess = () => resolve(req.result as OfflineManifestTicket | undefined);
      req.onerror = () => reject(req.error);
    }
  });

  if (!ticket) {
    return {
      status: "INVALID",
      message: "Billet introuvable dans le cache hors-ligne de cet événement.",
    };
  }

  if (ticket.eventId !== params.expectedEventId) {
    return {
      status: "WRONG_EVENT",
      message: `Ce billet appartient à un autre événement : "${ticket.eventTitle}".`,
      ticket,
    };
  }

  if (ticket.status === "USED") {
    const timeLabel = ticket.checkedInAt
      ? new Date(ticket.checkedInAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "précédemment";
    return {
      status: "ALREADY_USED",
      message: `Déjà scanné (hors-ligne/cache) à ${timeLabel} (${ticket.checkedInGate ?? "Porte"}).`,
      ticket,
    };
  }

  if (ticket.status === "REVOKED") {
    return { status: "INVALID", message: "Ce billet a été révoqué." };
  }

  const nowIso = new Date().toISOString();
  const updated: OfflineManifestTicket = {
    ...ticket,
    status: "USED",
    checkedInAt: nowIso,
    checkedInGate: params.gateLabel,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_TICKETS, STORE_PENDING], "readwrite");
    tx.objectStore(STORE_TICKETS).put(updated);
    tx.objectStore(STORE_PENDING).put({
      id: `${ticket.shortCode}-${Date.now()}`,
      shortCode: ticket.shortCode,
      qrPayload: ticket.qrPayload,
      eventId: ticket.eventId,
      gateLabel: params.gateLabel,
      scannedAt: nowIso,
    } satisfies PendingOfflineCheckin);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return {
    status: "VALID",
    message: "Validé en mode hors-ligne (en attente de synchronisation).",
    ticket: updated,
  };
}

