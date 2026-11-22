import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_CONFIG.fullName} — Billetterie & Contrôle Porte`,
    short_name: "Javeroo",
    description: SITE_CONFIG.description,
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#1B2A4A",
    lang: "fr",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Contrôle porte (Scan QR)",
        short_name: "Scan QR",
        url: "/scan",
        description: "Ouvrir l'outil de scan QR hors-ligne pour les agents d'entrée",
      },
      {
        name: "Événements UEMOA",
        short_name: "Événements",
        url: "/evenements",
        description: "Parcourir et filtrer les événements disponibles",
      },
    ],
  };
}

