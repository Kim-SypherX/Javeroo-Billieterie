import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/modules/auth/session";
import {
  buildUpdatedCustomEventsCookie,
  hydrateCustomEventsIntoStore,
} from "@/modules/events/custom-event-cookie";
import {
  createEventFromDashboard,
  registerOrganizationInStore,
  searchEvents,
} from "@/modules/events/store";
import { appendAuditLog } from "@/modules/operations/store";

const tierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Chaque catégorie de billet doit avoir un nom (ex. Pass Normal, Pass VIP).")
    .max(120),
  description: z.string().trim().max(240).optional(),
  priceXof: z.number().int().min(0, "Le prix doit être positif ou nul.").max(5_000_000),
  totalQty: z.number().int().min(1, "Indiquez au moins 1 place.").max(100_000),
});

const safeCoverImageSchema = z
  .string()
  .trim()
  .max(700_000, "L'affiche est trop lourde (réduisez sa taille ou activez Vercel Blob).")
  .refine(
    (val) =>
      val === "" ||
      val.startsWith("/uploads/") ||
      val.startsWith("https://") ||
      /^data:image\/(jpeg|png|webp|avif);base64,[A-Za-z0-9+/=]+$/.test(val),
    "Format d'URL d'affiche non autorisé.",
  )
  .optional();

const createEventSchema = z.object({
  title: z.string().trim().min(4, "Le titre doit contenir au moins 4 caractères.").max(180),
  shortSummary: z
    .string()
    .trim()
    .min(10, "La phrase d'accroche doit contenir au moins 10 caractères.")
    .max(280),
  description: z
    .string()
    .trim()
    .min(15, "La description détaillée doit contenir au moins 15 caractères.")
    .max(5000),
  category: z.enum([
    "concert",
    "festival",
    "humour",
    "conference",
    "sport",
    "culture",
    "formation",
    "soiree",
  ]),
  countryCode: z.enum(["BF", "CI", "SN", "BJ", "TG", "ML", "NE", "GW"]),
  city: z.string().trim().min(2, "Indiquez la ville.").max(100),
  venueName: z.string().trim().min(2, "Indiquez le nom de la salle ou du lieu.").max(160),
  venueAddress: z.string().trim().min(4, "Indiquez le quartier ou l'adresse.").max(240),
  locationHint: z.string().trim().max(240).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  mapsUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => v === "" || v.startsWith("https://") || v.startsWith("http://"),
      "Le lien Google Maps doit commencer par https://.",
    )
    .optional(),
  startsAt: z.string().min(8, "Indiquez la date et l'heure de début."),
  endsAt: z.string().min(8, "Indiquez la date et l'heure de fin."),
  coverImageUrl: safeCoverImageSchema,
  tiers: z
    .array(tierSchema)
    .min(1, "Ajoutez au moins une catégorie de billet.")
    .max(10, "Maximum 10 catégories de billets par événement."),
  promoCode: z.string().trim().max(40).optional(),
  promoPercent: z.number().int().min(0).max(90).optional(),
  // Champs réservés uniquement au SuperAdmin (publication déléguée au nom d'un promoteur)
  targetOrganizationId: z.string().trim().max(120).optional(),
  newOrganizer: z
    .object({
      name: z.string().trim().min(2, "Indiquez le nom du promoteur.").max(140),
      supportPhone: z.string().trim().max(40).optional(),
      supportEmail: z.string().trim().email("E-mail promoteur invalide.").optional().or(z.literal("")),
    })
    .optional(),
});

const FIELD_LABELS: Record<string, string> = {
  title: "Titre",
  shortSummary: "Phrase d'accroche",
  description: "Description détaillée",
  city: "Ville",
  venueName: "Nom du lieu",
  venueAddress: "Adresse / quartier",
  locationHint: "Repères pour trouver le lieu",
  mapsUrl: "Lien Google Maps",
  coverImageUrl: "Affiche officielle",
  tiers: "Catégories de billets",
  startsAt: "Date de début",
  endsAt: "Date de fin",
};

export async function GET(request: Request) {
  await hydrateCustomEventsIntoStore();
  const { searchParams } = new URL(request.url);
  const result = searchEvents({
    pays: searchParams.get("pays") ?? undefined,
    ville: searchParams.get("ville") ?? undefined,
    categorie: searchParams.get("categorie") ?? undefined,
    periode: (searchParams.get("periode") as "all" | "today" | "weekend" | "month") ?? "all",
    prix: (searchParams.get("prix") as "all" | "free" | "paid") ?? "all",
    q: searchParams.get("q") ?? undefined,
    tri: (searchParams.get("tri") as "date" | "price_asc" | "popular") ?? "date",
    page: Number(searchParams.get("page") ?? "1") || 1,
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json(
      {
        ok: false,
        error: "Veuillez vous connecter en tant qu'organisateur pour publier un événement.",
      },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const fieldKey = String(issue?.path[0] ?? "");
      const label = FIELD_LABELS[fieldKey];
      const message = label
        ? `${label} : ${issue?.message ?? "valeur invalide."}`
        : (issue?.message ?? "Formulaire incomplet.");
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }

    await hydrateCustomEventsIntoStore();

    // Isolation stricte : un ORGANIZER publie toujours pour sa propre organisation.
    // Si l'instance serverless n'a pas encore son profil organisation en mémoire, on le réhydrate depuis la session signée.
    let resolvedOrgId = session.organizationId;
    let isDelegated = false;

    if (session.role === "ORGANIZER" && session.organizationId) {
      const orgName = session.organizationName || session.fullName;
      const baseSlug = orgName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60);
      registerOrganizationInStore({
        id: session.organizationId,
        slug: `${baseSlug || "organisateur"}-${session.organizationId.slice(-4)}`,
        name: orgName,
        countryCode: parsed.data.countryCode,
        city: parsed.data.city,
        supportPhone: "",
        supportEmail: session.email,
      });
    }

    if (session.role === "PLATFORM_ADMIN") {
      if (parsed.data.newOrganizer?.name) {
        const orgName = parsed.data.newOrganizer.name.trim();
        const baseSlug = orgName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 60);
        const createdOrg = registerOrganizationInStore({
          id: `org-${crypto.randomBytes(5).toString("hex")}`,
          slug: `${baseSlug || "promoteur"}-${crypto.randomBytes(2).toString("hex")}`,
          name: orgName,
          countryCode: parsed.data.countryCode,
          city: parsed.data.city,
          supportPhone: parsed.data.newOrganizer.supportPhone?.trim() || "",
          supportEmail: parsed.data.newOrganizer.supportEmail?.trim() || "",
        });
        resolvedOrgId = createdOrg.id;
        isDelegated = true;
      } else if (parsed.data.targetOrganizationId) {
        resolvedOrgId = parsed.data.targetOrganizationId;
        isDelegated = true;
      }
    }

    const created = createEventFromDashboard({
      ...parsed.data,
      coverImageUrl: parsed.data.coverImageUrl || undefined,
      mapsUrl: parsed.data.mapsUrl || undefined,
      organizationId: resolvedOrgId,
    });

    if (session.role === "PLATFORM_ADMIN" && isDelegated) {
      appendAuditLog(
        session.fullName,
        "DELEGATED_EVENT_CREATED",
        `${created.title} (${created.organizer.name})`,
        `Événement publié en gestion déléguée avec ${created.tiers.length} catégorie(s) de billets.`,
      );
    }

    const customEventsCookie = await buildUpdatedCustomEventsCookie(created);
    const response = NextResponse.json({ ok: true, event: created }, { status: 201 });
    response.cookies.set(customEventsCookie);
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Impossible de créer l'événement." },
      { status: 500 },
    );
  }
}
