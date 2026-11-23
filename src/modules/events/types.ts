import type { FeeBearer } from "@/config/pricing";
import type { EventCategoryId } from "@/config/site";
import type { PaymentMethodId, UemoaCountryCode } from "@/config/uemoa";

export interface OrganizerView {
  id: string;
  slug: string;
  name: string;
  bio: string;
  countryCode: UemoaCountryCode;
  city: string;
  isVerified: boolean;
  supportPhone: string;
  supportEmail: string;
  accentFrom: string;
  accentTo: string;
}

export interface TicketTierView {
  id: string;
  name: string;
  description: string;
  priceXof: number;
  totalQty: number;
  soldQty: number;
  reservedQty: number;
  maxPerOrder: number;
}

export interface PromoCodeView {
  code: string;
  discountType: "PERCENTAGE" | "FIXED_XOF";
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
}

export interface EventView {
  id: string;
  slug: string;
  title: string;
  shortSummary: string;
  description: string;
  category: EventCategoryId;
  isFeatured: boolean;
  countryCode: UemoaCountryCode;
  city: string;
  venueName: string;
  venueAddress: string;
  locationHint?: string;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  feeBearer: FeeBearer;
  commissionBps: number;
  coverImageUrl?: string;
  organizerId: string;
  organizer: OrganizerView;
  tiers: TicketTierView[];
  promoCodes: PromoCodeView[];
  posterTheme: {
    from: string;
    via: string;
    to: string;
    badge: string;
    motif: "waves" | "grid" | "circles" | "beams";
  };
}

export interface IssuedTicketView {
  id: string;
  shortCode: string;
  qrPayload: string;
  qrDataUrl?: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventStartsAt: string;
  eventCity: string;
  eventVenue: string;
  tierId: string;
  tierName: string;
  unitPriceXof: number;
  attendeeName: string;
  status: "VALID" | "USED" | "REVOKED";
  checkedInAt?: string;
  checkedInGate?: string;
}

export interface OrderView {
  id: string;
  publicToken: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventStartsAt: string;
  eventCity: string;
  eventVenue: string;
  countryCode: UemoaCountryCode;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  promoCodeApplied?: string;
  paymentMethod: PaymentMethodId;
  paymentProviderRef: string;
  subtotalXof: number;
  discountXof: number;
  buyerFeeXof: number;
  platformCommissionXof: number;
  totalToPayXof: number;
  organizerNetXof: number;
  status: "PENDING" | "PAID" | "EXPIRED";
  createdAt: string;
  paidAt?: string;
  tickets: IssuedTicketView[];
}

export interface EventFilters {
  pays?: string;
  ville?: string;
  categorie?: string;
  periode?: "all" | "today" | "weekend" | "month";
  prix?: "all" | "free" | "paid";
  q?: string;
  tri?: "date" | "price_asc" | "popular";
  page?: number;
  pageSize?: number;
}

export interface CatalogResult {
  items: EventView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  availableCities: string[];
}

export function getTierRemaining(tier: TicketTierView): number {
  return Math.max(0, tier.totalQty - tier.soldQty - tier.reservedQty);
}

export function getEventMinPriceXof(event: EventView): number {
  if (event.tiers.length === 0) return 0;
  return Math.min(...event.tiers.map((t) => t.priceXof));
}

export function getEventAvailability(event: EventView): {
  totalQty: number;
  remainingQty: number;
  soldQty: number;
  status: "AVAILABLE" | "LOW_STOCK" | "SOLD_OUT";
} {
  const totalQty = event.tiers.reduce((sum, t) => sum + t.totalQty, 0);
  const soldQty = event.tiers.reduce((sum, t) => sum + t.soldQty, 0);
  const remainingQty = event.tiers.reduce((sum, t) => sum + getTierRemaining(t), 0);

  if (remainingQty === 0) {
    return { totalQty, remainingQty, soldQty, status: "SOLD_OUT" };
  }
  if (totalQty > 0 && remainingQty / totalQty <= 0.15) {
    return { totalQty, remainingQty, soldQty, status: "LOW_STOCK" };
  }
  return { totalQty, remainingQty, soldQty, status: "AVAILABLE" };
}

