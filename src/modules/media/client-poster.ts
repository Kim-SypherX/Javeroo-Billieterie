"use client";

const POSTER_CACHE_KEY = "javeroo_poster_cache_v1";
const MAX_CACHED_POSTERS = 16;
const MAX_TARGET_BYTES = 340 * 1024; // 340 Ko — fluide sur 3G/4G et compatible Vercel sans Blob
const MAX_DIMENSION = 1280;

interface CachedPosterEntry {
  eventId: string;
  slug: string;
  dataUrl: string;
  savedAt: number;
}

/**
 * Optimise automatiquement les affiches lourdes (notamment les PNG haute résolution issus de
 * Photoshop/Illustrator/Canva) côté navigateur avant l'upload vers /api/uploads/poster.
 * - Préserve le ratio exact jusqu'à 1280 px de large/haut.
 * - Convertit en WebP ou JPEG optimisé sous ~340 Ko pour passer partout (même sans Vercel Blob).
 */
export async function optimizePosterFileForUpload(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  // Les petits fichiers (< 320 Ko) déjà dans un format supporté sont envoyés tels quels
  if (file.size <= 320 * 1024 && ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
    return file;
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Image illisible"));
        el.src = objectUrl;
      });

      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const width = Math.max(1, Math.round((img.naturalWidth || 1200) * scale));
      const height = Math.max(1, Math.round((img.naturalHeight || 675) * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      // Fond neutre blanc pour éviter les transparences PNG qui deviennent noires en JPEG
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const toBlobAsync = (type: string, quality: number) =>
        new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

      // Essai progressif en WebP puis fallback JPEG jusqu'à descendre sous MAX_TARGET_BYTES
      const attempts: Array<{ mime: string; ext: string; quality: number }> = [
        { mime: "image/webp", ext: "webp", quality: 0.86 },
        { mime: "image/webp", ext: "webp", quality: 0.74 },
        { mime: "image/jpeg", ext: "jpg", quality: 0.84 },
        { mime: "image/jpeg", ext: "jpg", quality: 0.72 },
        { mime: "image/jpeg", ext: "jpg", quality: 0.6 },
      ];

      let bestBlob: { blob: Blob; mime: string; ext: string } | null = null;
      for (const attempt of attempts) {
        const blob = await toBlobAsync(attempt.mime, attempt.quality);
        if (!blob || blob.size === 0) continue;
        if (!bestBlob || blob.size < bestBlob.blob.size) {
          bestBlob = { blob, mime: attempt.mime, ext: attempt.ext };
        }
        if (blob.size <= MAX_TARGET_BYTES) {
          bestBlob = { blob, mime: attempt.mime, ext: attempt.ext };
          break;
        }
      }

      if (bestBlob && bestBlob.blob.size < file.size) {
        const baseName = file.name.replace(/\.[^.]+$/, "") || "affiche";
        return new File([bestBlob.blob], `${baseName}.${bestBlob.ext}`, {
          type: bestBlob.mime,
          lastModified: Date.now(),
        });
      }
      return file;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return file;
  }
}

/**
 * Mémorise localement l'affiche d'un événement tout juste publié en mode sans Vercel Blob
 * afin qu'elle s'affiche immédiatement dans le catalogue (/evenements) et sur la fiche
 * même si la requête passe par une autre instance serverless Vercel.
 */
export function saveCachedEventPoster(eventId: string, slug: string, imageUrl: string): void {
  if (typeof window === "undefined" || !imageUrl) return;
  try {
    const raw = window.localStorage.getItem(POSTER_CACHE_KEY);
    const list: CachedPosterEntry[] = raw ? (JSON.parse(raw) as CachedPosterEntry[]) : [];
    const filtered = list.filter((e) => e.eventId !== eventId && e.slug !== slug);
    const updated: CachedPosterEntry[] = [
      { eventId, slug, dataUrl: imageUrl, savedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX_CACHED_POSTERS);

    // En cas de dépassement quota localStorage, réduire progressivement la taille du cache
    for (let len = updated.length; len >= 1; len--) {
      try {
        window.localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(updated.slice(0, len)));
        return;
      } catch {
        // Réessaie avec moins d'entrées
      }
    }
  } catch {
    // localStorage indisponible (navigation privée stricte)
  }
}

export function readCachedEventPoster(eventId: string, slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(POSTER_CACHE_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw) as CachedPosterEntry[];
    if (!Array.isArray(list)) return null;
    const match = list.find((e) => e.eventId === eventId || e.slug === slug);
    return match?.dataUrl ?? null;
  } catch {
    return null;
  }
}

