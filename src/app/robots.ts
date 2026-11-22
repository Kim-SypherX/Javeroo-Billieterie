import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/evenements",
          "/promoteurs",
          "/tarifs",
          "/mentions-legales",
          "/cgu",
          "/cgvps",
          "/confidentialite",
        ],
        disallow: ["/dashboard", "/admin", "/scan", "/commandes/", "/connexion", "/inscription", "/api/"],
      },
    ],
    sitemap: `${SITE_CONFIG.baseUrl}/sitemap.xml`,
  };
}
