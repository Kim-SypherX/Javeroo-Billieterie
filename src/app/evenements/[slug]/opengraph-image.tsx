import { ImageResponse } from "next/og";
import { EVENT_CATEGORY_MAP } from "@/config/site";
import { formatEventDate, formatXof, getCountryByCode } from "@/config/uemoa";
import { getEventBySlug } from "@/modules/events/store";
import { getEventMinPriceXof } from "@/modules/events/types";

export const alt = "Billet événement Javeroo-Billeterie";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function EventOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  const title = event?.title ?? "Événement sur Javeroo-Billeterie";
  const cityLabel = event
    ? `${event.venueName} · ${event.city}, ${getCountryByCode(event.countryCode).name}`
    : "Zone UEMOA";
  const dateLabel = event ? formatEventDate(event.startsAt, event.timezone) : "Réservation ouverte";
  const categoryLabel = event ? EVENT_CATEGORY_MAP[event.category].label : "ÉVÉNEMENT";
  const minPrice = event ? getEventMinPriceXof(event) : 0;
  const priceLabel = minPrice === 0 ? "Entrée gratuite" : `Dès ${formatXof(minPrice)}`;
  const bgFrom = event?.posterTheme.from ?? "#1B2A4A";
  const bgTo = event?.posterTheme.to ?? "#0EA5A4";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: `linear-gradient(135deg, ${bgFrom} 0%, #1B2A4A 52%, ${bgTo} 100%)`,
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              background: "#0EA5A4",
              color: "#0F172A",
              borderRadius: "999px",
              padding: "10px 22px",
              fontSize: "20px",
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            {categoryLabel}
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#CCFBF1" }}>
            Javeroo-Billeterie
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#5EEAD4" }}>{dateLabel}</div>
          <div style={{ fontSize: "56px", fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: "26px", color: "#E2E8F0" }}>{cityLabel}</div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid rgba(255,255,255,0.22)",
            paddingTop: "24px",
          }}
        >
          <div style={{ fontSize: "34px", fontWeight: 800, color: "#FFFFFF" }}>{priceLabel}</div>
          <div
            style={{
              background: "#FFFFFF",
              color: "#1B2A4A",
              borderRadius: "16px",
              padding: "14px 28px",
              fontSize: "22px",
              fontWeight: 800,
            }}
          >
            Réserver par Mobile Money
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

