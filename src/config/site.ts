export type EventCategoryId =
  | "concert"
  | "festival"
  | "humour"
  | "conference"
  | "sport"
  | "culture"
  | "formation"
  | "soiree";

export interface EventCategory {
  id: EventCategoryId;
  label: string;
}

export const EVENT_CATEGORIES: readonly EventCategory[] = [
  { id: "concert", label: "Concert" },
  { id: "festival", label: "Festival" },
  { id: "humour", label: "Humour" },
  { id: "conference", label: "Conférence" },
  { id: "sport", label: "Sport" },
  { id: "culture", label: "Culture & Arts" },
  { id: "formation", label: "Formation" },
  { id: "soiree", label: "Soirée & Gala" },
] as const;

export const EVENT_CATEGORY_MAP: Record<EventCategoryId, EventCategory> = Object.fromEntries(
  EVENT_CATEGORIES.map((c) => [c.id, c]),
) as Record<EventCategoryId, EventCategory>;

export const SITE_CONFIG = {
  brandName: "Javeroo",
  fullName: "Javeroo-Billeterie",
  tagline: "Billetterie en ligne & Mobile Money en Afrique de l'Ouest",
  description:
    "Achetez vos billets de concerts, festivals et conférences en zone UEMOA en moins d'une minute par Mobile Money, sans application obligatoire et sans publicité.",
  baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  contact: {
    supportEmail: "support@javeroo.com",
    privacyEmail: "privacy@javeroo.com",
    whatsappDisplay: "+226 00 00 00 00",
    whatsappUrl: "https://wa.me/22600000000",
  },
  legal: {
    companyName: "Javeroo SAS",
    legalForm: "Société par Actions Simplifiée (en cours d'immatriculation)",
    cityCountry: "Ouagadougou, Burkina Faso",
    address: "Quartier Ouaga 2000, Secteur 15, Ouagadougou, Burkina Faso",
    rccm: "En cours d'attribution (à compléter avant mise en production)",
    ifu: "En cours d'attribution (à compléter avant mise en production)",
    publicationDirector: "Direction Générale Javeroo",
    hostingProvider: "Infrastructure Cloud Européenne (à préciser au déploiement production)",
    lastUpdated: "Novembre 2026",
    version: "1.0",
  },
  socialLinks: [
    { label: "Facebook", href: "https://facebook.com/javeroo" },
    { label: "Instagram", href: "https://instagram.com/javeroo" },
    { label: "LinkedIn", href: "https://linkedin.com/company/javeroo" },
    { label: "WhatsApp", href: "https://wa.me/22600000000" },
  ],
} as const;

/**
 * Construit un <title> propre et non redondant (évite tout doublon "| Javeroo | Javeroo").
 */
export function buildPageTitle(pageTitle: string): string {
  const cleaned = pageTitle.trim();
  if (cleaned.toLowerCase().includes(SITE_CONFIG.brandName.toLowerCase())) {
    return cleaned;
  }
  return `${cleaned} | ${SITE_CONFIG.brandName}`;
}

