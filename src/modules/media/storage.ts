import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const MAX_POSTER_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

export type AllowedImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/avif";

const MIME_TO_EXT: Record<AllowedImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * Vérifie les octets magiques réels du fichier (anti-spoofing : empêche un script
 * ou SVG malveillant renommé en .jpg d'être accepté).
 */
export function detectVerifiedImageMime(buffer: Buffer): AllowedImageMime | null {
  if (buffer.length < 12) return null;

  // JPEG : FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP : RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  // AVIF : ....ftypavif ou ....ftypavis
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") {
      return "image/avif";
    }
  }

  return null;
}

export function validatePosterUpload(buffer: Buffer):
  | { ok: true; mime: AllowedImageMime; ext: string }
  | { ok: false; error: string } {
  if (buffer.length === 0) {
    return { ok: false, error: "Le fichier image est vide." };
  }
  if (buffer.length > MAX_POSTER_SIZE_BYTES) {
    return { ok: false, error: "L'affiche dépasse la taille maximale autorisée (5 Mo)." };
  }

  const verifiedMime = detectVerifiedImageMime(buffer);
  if (!verifiedMime) {
    return {
      ok: false,
      error: "Format d'image non pris en charge. Utilisez JPEG, PNG, WebP ou AVIF.",
    };
  }

  return { ok: true, mime: verifiedMime, ext: MIME_TO_EXT[verifiedMime] };
}

/**
 * Enregistre une affiche d'événement sur un emplacement public immuable (jamais d'URL présignée
 * éphémère qui casserait le cache navigateur/CDN).
 * - En local/dev : écrit sous public/uploads/events/<hash>.<ext> -> servi sur /uploads/events/...
 * - En production avec R2 configuré : prêt pour PUT objet S3/R2 public + Cache-Control immutable.
 */
export async function storePublicEventPoster(buffer: Buffer): Promise<
  | { ok: true; key: string; publicUrl: string; mime: AllowedImageMime; sizeBytes: number }
  | { ok: false; error: string }
> {
  const check = validatePosterUpload(buffer);
  if (!check.ok) return check;

  const contentHash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const filename = `evt-${Date.now()}-${contentHash}.${check.ext}`;
  const key = `uploads/events/${filename}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "events");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), buffer);

  return {
    ok: true,
    key,
    publicUrl: `/${key}`,
    mime: check.mime,
    sizeBytes: buffer.length,
  };
}

