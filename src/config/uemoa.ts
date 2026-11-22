export type UemoaCountryCode = "BF" | "CI" | "SN" | "BJ" | "TG" | "ML" | "NE" | "GW";

export type PaymentMethodId =
  | "ORANGE_MONEY"
  | "WAVE"
  | "MOOV_MONEY"
  | "MTN_MOMO"
  | "MIXX_TMONEY"
  | "CARD";

export interface PaymentMethodInfo {
  id: PaymentMethodId;
  name: string;
  shortName: string;
  kind: "mobile_money" | "card";
  accentColor: string;
}

export interface UemoaCountry {
  code: UemoaCountryCode;
  name: string;
  dialCode: string;
  currency: "XOF";
  timezone: string;
  majorCities: readonly string[];
  paymentMethods: readonly PaymentMethodId[];
}

export const PAYMENT_METHODS: Record<PaymentMethodId, PaymentMethodInfo> = {
  ORANGE_MONEY: {
    id: "ORANGE_MONEY",
    name: "Orange Money",
    shortName: "Orange Money",
    kind: "mobile_money",
    accentColor: "#FF6600",
  },
  WAVE: {
    id: "WAVE",
    name: "Wave",
    shortName: "Wave",
    kind: "mobile_money",
    accentColor: "#1DC4F0",
  },
  MOOV_MONEY: {
    id: "MOOV_MONEY",
    name: "Moov Money",
    shortName: "Moov Money",
    kind: "mobile_money",
    accentColor: "#0066B3",
  },
  MTN_MOMO: {
    id: "MTN_MOMO",
    name: "MTN Mobile Money",
    shortName: "MTN MoMo",
    kind: "mobile_money",
    accentColor: "#FFCB05",
  },
  MIXX_TMONEY: {
    id: "MIXX_TMONEY",
    name: "Mixx by Yas / T-Money",
    shortName: "Mixx / T-Money",
    kind: "mobile_money",
    accentColor: "#0052A5",
  },
  CARD: {
    id: "CARD",
    name: "Carte bancaire (Visa / Mastercard)",
    shortName: "Visa / Mastercard",
    kind: "card",
    accentColor: "#1B2A4A",
  },
};

/**
 * Référentiel unique des 8 pays de la zone UEMOA (devise unique XOF / FCFA).
 * Consommé sur la vitrine, les filtres catalogue, le checkout, les tarifs et les CGV.
 */
export const UEMOA_COUNTRIES: readonly UemoaCountry[] = [
  {
    code: "BF",
    name: "Burkina Faso",
    dialCode: "+226",
    currency: "XOF",
    timezone: "Africa/Ouagadougou",
    majorCities: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou"],
    paymentMethods: ["ORANGE_MONEY", "MOOV_MONEY", "WAVE", "CARD"],
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    dialCode: "+225",
    currency: "XOF",
    timezone: "Africa/Abidjan",
    majorCities: ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro"],
    paymentMethods: ["WAVE", "ORANGE_MONEY", "MTN_MOMO", "MOOV_MONEY", "CARD"],
  },
  {
    code: "SN",
    name: "Sénégal",
    dialCode: "+221",
    currency: "XOF",
    timezone: "Africa/Dakar",
    majorCities: ["Dakar", "Thiès", "Saint-Louis", "Saly"],
    paymentMethods: ["WAVE", "ORANGE_MONEY", "MIXX_TMONEY", "CARD"],
  },
  {
    code: "BJ",
    name: "Bénin",
    dialCode: "+229",
    currency: "XOF",
    timezone: "Africa/Porto-Novo",
    majorCities: ["Cotonou", "Porto-Novo", "Abomey-Calavi", "Parakou"],
    paymentMethods: ["MTN_MOMO", "MOOV_MONEY", "CARD"],
  },
  {
    code: "TG",
    name: "Togo",
    dialCode: "+228",
    currency: "XOF",
    timezone: "Africa/Lome",
    majorCities: ["Lomé", "Kara", "Sokodé"],
    paymentMethods: ["MIXX_TMONEY", "MOOV_MONEY", "CARD"],
  },
  {
    code: "ML",
    name: "Mali",
    dialCode: "+223",
    currency: "XOF",
    timezone: "Africa/Bamako",
    majorCities: ["Bamako", "Sikasso", "Ségou"],
    paymentMethods: ["ORANGE_MONEY", "MOOV_MONEY", "WAVE", "CARD"],
  },
  {
    code: "NE",
    name: "Niger",
    dialCode: "+227",
    currency: "XOF",
    timezone: "Africa/Niamey",
    majorCities: ["Niamey", "Zinder", "Maradi"],
    paymentMethods: ["MOOV_MONEY", "ORANGE_MONEY", "CARD"],
  },
  {
    code: "GW",
    name: "Guinée-Bissau",
    dialCode: "+245",
    currency: "XOF",
    timezone: "Africa/Bissau",
    majorCities: ["Bissau", "Bafatá"],
    paymentMethods: ["ORANGE_MONEY", "MTN_MOMO", "CARD"],
  },
] as const;

export const UEMOA_COUNTRY_MAP: Record<UemoaCountryCode, UemoaCountry> = Object.fromEntries(
  UEMOA_COUNTRIES.map((c) => [c.code, c]),
) as Record<UemoaCountryCode, UemoaCountry>;

export function isUemoaCountryCode(value: string): value is UemoaCountryCode {
  return value in UEMOA_COUNTRY_MAP;
}

export function getCountryByCode(code: UemoaCountryCode): UemoaCountry {
  return UEMOA_COUNTRY_MAP[code];
}

/**
 * Formatage strict francophone des montants XOF (espaces insécables, jamais de virgule anglophone).
 * Exemple : 5000 -> "5 000 FCFA"
 */
export function formatXof(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(rounded);
  return `${formatted}\u00A0FCFA`;
}

export function formatEventDate(isoDate: string, timezone = "Africa/Ouagadougou"): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

export function formatEventTime(isoDate: string, timezone = "Africa/Ouagadougou"): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

