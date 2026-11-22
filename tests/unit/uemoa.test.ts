import { describe, expect, it } from "vitest";
import { buildPageTitle } from "@/config/site";
import { formatXof, isUemoaCountryCode, UEMOA_COUNTRIES } from "@/config/uemoa";

describe("UEMOA single source of truth", () => {
  it("contient exactement les 8 pays UEMOA tous en XOF", () => {
    expect(UEMOA_COUNTRIES).toHaveLength(8);
    for (const country of UEMOA_COUNTRIES) {
      expect(country.currency).toBe("XOF");
      expect(country.paymentMethods.length).toBeGreaterThanOrEqual(2);
    }
    // Vérifie que la Guinée-Conakry (GNF) n'est pas listée à tort en XOF
    expect(isUemoaCountryCode("GN")).toBe(false);
    expect(isUemoaCountryCode("BF")).toBe(true);
    expect(isUemoaCountryCode("CI")).toBe(true);
  });

  it("formate les montants FCFA à la française (sans virgule anglophone)", () => {
    const formatted = formatXof(25000);
    expect(formatted).toContain("FCFA");
    expect(formatted).not.toContain(",");
    expect(formatted.replace(/\s+/g, " ")).toBe("25 000 FCFA");
  });

  it("construit des titres SEO sans jamais dupliquer la marque", () => {
    expect(buildPageTitle("Tarifs")).toBe("Tarifs | Javeroo");
    expect(buildPageTitle("Tarifs | Javeroo")).toBe("Tarifs | Javeroo");
  });
});

