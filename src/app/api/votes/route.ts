import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/modules/auth/session";
import { registerOrganizationInStore } from "@/modules/events/store";
import { appendAuditLog } from "@/modules/operations/store";
import {
  buildUpdatedVoteCampaignsCookie,
  hydrateVotesIntoStore,
} from "@/modules/votes/cookie-store";
import { createVoteCampaign, searchVoteCampaigns } from "@/modules/votes/store";

const safeImageUrlSchema = z
  .string()
  .trim()
  .max(1_100_000, "L'image est trop lourde (réduisez sa taille ou activez Vercel Blob).")
  .refine(
    (val) =>
      val === "" ||
      val.startsWith("/uploads/") ||
      val.startsWith("https://") ||
      /^data:image\/(jpeg|png|webp|avif);base64,[A-Za-z0-9+/=]+$/.test(val),
    "Format d'image non autorisé.",
  )
  .optional();

const candidateInputSchema = z.object({
  code: z.string().trim().max(16).optional(),
  name: z.string().trim().min(2, "Chaque candidat doit avoir un nom.").max(120),
  subtitle: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(400).optional(),
  photoUrl: safeImageUrlSchema,
});

const createCampaignSchema = z.object({
  title: z.string().trim().min(4, "Le titre du concours doit contenir au moins 4 caractères.").max(180),
  shortSummary: z
    .string()
    .trim()
    .min(10, "La phrase d'accroche doit contenir au moins 10 caractères.")
    .max(280),
  description: z
    .string()
    .trim()
    .min(15, "La description doit contenir au moins 15 caractères.")
    .max(5000),
  category: z.enum(["miss", "awards", "musique", "sport", "createur", "etudiant"]),
  countryCode: z.enum(["BF", "CI", "SN", "BJ", "TG", "ML", "NE", "GW"]),
  city: z.string().trim().min(2, "Indiquez la ville.").max(100),
  startsAt: z.string().min(8, "Indiquez la date d'ouverture."),
  endsAt: z.string().min(8, "Indiquez la date de clôture."),
  unitVotePriceXof: z.number().int().min(0, "Le prix par voix doit être positif ou nul.").max(100_000),
  maxVotesPerTx: z.number().int().min(1).max(2000).optional(),
  showLiveResults: z.boolean().optional(),
  coverImageUrl: safeImageUrlSchema,
  candidates: z
    .array(candidateInputSchema)
    .min(2, "Ajoutez au moins 2 candidats pour lancer un concours de vote.")
    .max(30, "Maximum 30 candidats lors de la création."),
  // Réservés au SuperAdmin (publication déléguée)
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
  title: "Titre du concours",
  shortSummary: "Phrase d'accroche",
  description: "Règlement / Description",
  city: "Ville",
  unitVotePriceXof: "Prix d'un vote (FCFA)",
  coverImageUrl: "Affiche du concours",
  candidates: "Candidats",
  startsAt: "Date d'ouverture",
  endsAt: "Date de clôture",
};

export async function GET(request: Request) {
  await hydrateVotesIntoStore();
  const { searchParams } = new URL(request.url);
  const campaigns = searchVoteCampaigns({
    pays: searchParams.get("pays") ?? undefined,
    categorie: searchParams.get("categorie") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });
  return NextResponse.json({ ok: true, campaigns });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json(
      { ok: false, error: "Connectez-vous en tant qu'organisateur pour créer un concours de vote." },
      { status: 401 },
    );
  }

  try {
    await hydrateVotesIntoStore();
    const body = await request.json();
    const parsed = createCampaignSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const fieldKey = String(issue?.path[0] ?? "");
      const label = FIELD_LABELS[fieldKey];
      const message = label
        ? `${label} : ${issue?.message ?? "valeur invalide."}`
        : (issue?.message ?? "Formulaire incomplet.");
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }

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

    const campaign = createVoteCampaign({
      ...parsed.data,
      coverImageUrl: parsed.data.coverImageUrl || undefined,
      organizationId: resolvedOrgId,
    });

    appendAuditLog(
      session.fullName,
      isDelegated ? "DELEGATED_VOTE_CAMPAIGN_CREATED" : "VOTE_CAMPAIGN_CREATED",
      `${campaign.title} (${campaign.organizer.name})`,
      `Concours publié avec ${campaign.candidates.length} candidats (${campaign.unitVotePriceXof} FCFA / voix).`,
    );

    const voteCookie = await buildUpdatedVoteCampaignsCookie(campaign);
    const response = NextResponse.json({ ok: true, campaign }, { status: 201 });
    response.cookies.set(voteCookie);
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Impossible de créer la campagne de vote." },
      { status: 500 },
    );
  }
}

