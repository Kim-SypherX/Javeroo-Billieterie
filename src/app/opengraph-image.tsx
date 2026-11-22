import { ImageResponse } from "next/og";
import { PRICING_CONFIG } from "@/config/pricing";

export const alt = "Javeroo-Billeterie — Billetterie en ligne & Mobile Money en zone UEMOA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function GlobalOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #1B2A4A 0%, #0F4C81 60%, #0EA5A4 100%)",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: "30px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#0EA5A4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1B2A4A",
                fontSize: "26px",
                fontWeight: 900,
              }}
            >
              J
            </div>
            <span>Javeroo-Billeterie</span>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.16)",
              borderRadius: "999px",
              padding: "10px 22px",
              fontSize: "20px",
              fontWeight: 700,
              color: "#CCFBF1",
            }}
          >
            8 PAYS UEMOA · FCFA
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: "58px", fontWeight: 800, lineHeight: 1.12 }}>
            Vos billets en 30 secondes par Mobile Money.
          </div>
          <div style={{ fontSize: "26px", color: "#E2E8F0", lineHeight: 1.35 }}>
            100 % Web · Sans application obligatoire · Zéro publicité · Scan porte hors-ligne
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
            borderTop: "2px solid rgba(255,255,255,0.2)",
            paddingTop: "24px",
            fontSize: "22px",
            fontWeight: 700,
            color: "#5EEAD4",
          }}
        >
          <span>0 FCFA / mois</span>
          <span>·</span>
          <span>{PRICING_CONFIG.standardCommissionPercent} % tout inclus</span>
          <span>·</span>
          <span>Reversement {PRICING_CONFIG.payoutSla.mobileMoneyLabel}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

