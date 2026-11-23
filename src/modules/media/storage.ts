import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const MAX_POSTER_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
const MAX_INLINE_PREVIEW_BYTES = 750 * 1024; // 750 Ko en fallback preview sans Blob/R2

export type AllowedImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/avif";

const MIME_TO_EXT: Record<AllowedImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function getActiveStorageDriver(): "vercel_blob" | "local_fs" | "vercel_preview_inline" {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return "vercel_blob";
  }
  if (process.env.VERCEL === "1") {
    return "vercel_preview_inline";
  }
  return "local_fs";
}

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
 * - Si BLOB_READ_WRITE_TOKEN est configuré (Vercel Blob) : upload direct CDN Vercel Blob public.
 * - En local (non-Vercel) : écrit sous public/uploads/events/<hash>.<ext>.
 * - Sur Vercel Preview sans Blob configuré : évite tout crash EROFS (système de fichiers lecture seule).
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

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    const res = await fetch(`https://blob.vercel-storage.com/${key}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${blobToken}`,
        "Content-Type": check.mime,
        "x-api-version": "7",
        "x-cache-control-max-age": "31536000",
        "x-add-random-suffix": "0",
      },
      body: new Uint8Array(buffer),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: "Échec du téléversement vers Vercel Blob. Vérifiez BLOB_READ_WRITE_TOKEN.",
      };
    }

    const data = (await res.json()) as { url: string; pathname?: string };
    return {
      ok: true,
      key: data.pathname ?? key,
      publicUrl: data.url,
      mime: check.mime,
      sizeBytes: buffer.length,
    };
  }

  // Sur Vercel Serverless, le disque local est en lecture seule (EROFS)
  if (process.env.VERCEL === "1") {
    if (buffer.length > MAX_INLINE_PREVIEW_BYTES) {
      return {
        ok: false,
        error:
          "L'affiche dépasse 750 Ko en mode sans Vercel Blob. Activez Vercel Blob (BLOB_READ_WRITE_TOKEN) ou réduisez légèrement sa résolution.",
      };
    }
    return {
      ok: true,
      key,
      publicUrl: `data:${check.mime};base64,${buffer.toString("base64")}`,
      mime: check.mime,
      sizeBytes: buffer.length,
    };
  }

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
