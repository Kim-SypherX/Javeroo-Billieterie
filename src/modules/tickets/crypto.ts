import crypto from "node:crypto";

const DEFAULT_DEV_SECRET =
  "dev-only-change-me-in-production-64-chars-minimum-secret-key-javeroo";

function getSigningSecret(): string {
  const configured = process.env.TICKET_SIGNING_SECRET;
  if (configured && configured.length >= 32) {
    return configured;
  }
  if (process.env.VERCEL_ENV === "production") {
    console.warn(
      "[SECURITY] TICKET_SIGNING_SECRET absent ou trop court (<32 car.). Configurez-le dans Vercel Environment Variables.",
    );
  }
  return DEFAULT_DEV_SECRET;
}

export interface SignedTicketClaims {
  version: "v1";
  ticketId: string;
  eventId: string;
  tierCode: string;
}

export interface VerificationResult {
  valid: boolean;
  claims?: SignedTicketClaims;
  reason?: "MALFORMED" | "INVALID_SIGNATURE" | "WRONG_EVENT";
}

/**
 * Produit un payload QR compact signé par HMAC-SHA256 :
 *   v1.<ticketId>.<eventId>.<tierCode>.<signatureHex24>
 * Format court et résistant à la lecture caméra en faible luminosité.
 */
export function signTicketPayload(params: {
  ticketId: string;
  eventId: string;
  tierCode: string;
  secret?: string;
}): string {
  const cleanTier = params.tierCode.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 16) || "STD";
  const body = `v1.${params.ticketId}.${params.eventId}.${cleanTier}`;
  const sig = crypto
    .createHmac("sha256", params.secret ?? getSigningSecret())
    .update(body)
    .digest("base64url")
    .slice(0, 24);
  return `${body}.${sig}`;
}

/**
 * Vérifie cryptographiquement un QR code scanné (en temps constant contre les attaques temporelles).
 */
export function verifyTicketPayload(
  payload: string,
  options?: { expectedEventId?: string; secret?: string },
): VerificationResult {
  const trimmed = payload.trim();
  const segments = trimmed.split(".");
  if (segments.length !== 5) {
    return { valid: false, reason: "MALFORMED" };
  }

  const [version, ticketId, eventId, tierCode, providedSig] = segments;
  if (version !== "v1" || !ticketId || !eventId || !tierCode || !providedSig) {
    return { valid: false, reason: "MALFORMED" };
  }

  const body = `${version}.${ticketId}.${eventId}.${tierCode}`;
  const expectedSig = crypto
    .createHmac("sha256", options?.secret ?? getSigningSecret())
    .update(body)
    .digest("base64url")
    .slice(0, 24);

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  if (options?.expectedEventId && eventId !== options.expectedEventId) {
    return {
      valid: false,
      reason: "WRONG_EVENT",
      claims: { version: "v1", ticketId, eventId, tierCode },
    };
  }

  return {
    valid: true,
    claims: { version: "v1", ticketId, eventId, tierCode },
  };
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sans O/0/I/1 pour éviter toute confusion à l'entrée

/**
 * Génère un code court lisible de secours (ex. JVR-8K4P-2M9Q) pour vérification manuelle à la porte.
 */
export function generateReadableTicketCode(): string {
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    const byte = bytes[i] ?? 0;
    out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    if (i === 3) out += "-";
  }
  return `JVR-${out}`;
}

