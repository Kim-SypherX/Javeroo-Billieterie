import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";
import { SEED_ORGANIZERS } from "@/modules/events/dev-data";
import { listAllEvents } from "@/modules/events/store";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_CONFIG.baseUrl;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/evenements`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/tarifs`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cgu`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cgvps`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const eventRoutes: MetadataRoute.Sitemap = listAllEvents().map((evt) => ({
    url: `${base}/evenements/${evt.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  const organizerRoutes: MetadataRoute.Sitemap = SEED_ORGANIZERS.map((org) => ({
    url: `${base}/promoteurs/${org.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...eventRoutes, ...organizerRoutes];
}

