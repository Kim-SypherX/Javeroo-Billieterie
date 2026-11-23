import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum("user_role", [
  "USER",
  "ORGANIZER",
  "PLATFORM_ADMIN",
  "PLATFORM_FINANCE",
  "PLATFORM_SUPPORT",
]);

export const orgMemberRoleEnum = pgEnum("org_member_role", ["OWNER", "ADMIN", "MANAGER"]);

export const kycStatusEnum = pgEnum("kyc_status", [
  "NOT_SUBMITTED",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "CANCELLED",
  "ENDED",
]);

export const feeBearerEnum = pgEnum("fee_bearer", ["ORGANIZER", "BUYER"]);

export const promoDiscountTypeEnum = pgEnum("promo_discount_type", ["PERCENTAGE", "FIXED_XOF"]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "PAID",
  "EXPIRED",
  "CANCELLED",
  "REFUNDED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "INITIATED",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
]);

export const ticketStatusEnum = pgEnum("ticket_status", ["VALID", "USED", "REVOKED", "REFUNDED"]);

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "TICKET_SALE",
  "PLATFORM_COMMISSION",
  "PAYMENT_FEE",
  "REFUND",
  "PAYOUT_HOLD",
  "PAYOUT_RELEASE",
  "ADJUSTMENT",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "REQUESTED",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
]);

// ============================================================================
// UTILISATEURS, ORGANISATIONS & KYC
// ============================================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    role: userRoleEnum("role").default("USER").notNull(),
    passwordHash: text("password_hash"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_phone_unique").on(table.phone),
  ],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    bio: text("bio"),
    logoKey: text("logo_key"),
    countryCode: char("country_code", { length: 2 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    supportPhone: varchar("support_phone", { length: 32 }),
    supportEmail: varchar("support_email", { length: 255 }),
    kycStatus: kycStatusEnum("kyc_status").default("NOT_SUBMITTED").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organizations_slug_unique").on(table.slug),
    check(
      "organizations_uemoa_country_check",
      sql`${table.countryCode} IN ('BF','CI','SN','BJ','TG','ML','NE','GW')`,
    ),
  ],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgMemberRoleEnum("role").default("MANAGER").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("org_members_org_user_unique").on(table.organizationId, table.userId),
  ],
);

export const kycSubmissions = pgTable("kyc_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  legalEntityType: varchar("legal_entity_type", { length: 32 }).notNull(), // INDIVIDUAL | COMPANY
  documentType: varchar("document_type", { length: 64 }).notNull(), // CNIB | PASSPORT | RCCM
  documentR2Key: text("document_r2_key").notNull(), // Bucket R2 PRIVÉ uniquement
  payoutMethod: varchar("payout_method", { length: 32 }).notNull(), // MOBILE_MONEY | BANK
  payoutDestinationMasked: varchar("payout_destination_masked", { length: 120 }).notNull(),
  status: kycStatusEnum("status").default("PENDING").notNull(),
  rejectionReason: text("rejection_reason"),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// ÉVÉNEMENTS, CATÉGORIES DE BILLETS & CODES PROMO
// ============================================================================

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    shortSummary: varchar("short_summary", { length: 280 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 40 }).notNull(),
    status: eventStatusEnum("status").default("DRAFT").notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    countryCode: char("country_code", { length: 2 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    venueName: varchar("venue_name", { length: 160 }).notNull(),
    venueAddress: varchar("venue_address", { length: 240 }).notNull(),
    latitude: varchar("latitude", { length: 32 }),
    longitude: varchar("longitude", { length: 32 }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    timezone: varchar("timezone", { length: 64 }).default("Africa/Ouagadougou").notNull(),
    coverImageKey: text("cover_image_key"), // Clé sur bucket R2 PUBLIC (cdn.javeroo.com)
    feeBearer: feeBearerEnum("fee_bearer").default("ORGANIZER").notNull(),
    commissionBps: integer("commission_bps").default(800).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("events_slug_unique").on(table.slug),
    index("events_catalog_idx").on(table.status, table.countryCode, table.startsAt),
    check(
      "events_uemoa_country_check",
      sql`${table.countryCode} IN ('BF','CI','SN','BJ','TG','ML','NE','GW')`,
    ),
    check("events_commission_bps_check", sql`${table.commissionBps} >= 0 AND ${table.commissionBps} <= 2500`),
  ],
);

export const ticketTiers = pgTable(
  "ticket_tiers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 260 }),
    priceXof: integer("price_xof").notNull(),
    totalQty: integer("total_qty").notNull(),
    soldQty: integer("sold_qty").default(0).notNull(),
    reservedQty: integer("reserved_qty").default(0).notNull(),
    maxPerOrder: integer("max_per_order").default(10).notNull(),
    saleStartsAt: timestamp("sale_starts_at", { withTimezone: true }),
    saleEndsAt: timestamp("sale_ends_at", { withTimezone: true }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ticket_tiers_event_idx").on(table.eventId, table.sortOrder),
    // Invariant anti-survente garanti au niveau moteur PostgreSQL
    check(
      "ticket_tiers_inventory_check",
      sql`${table.priceXof} >= 0 AND ${table.totalQty} > 0 AND ${table.soldQty} >= 0 AND ${table.reservedQty} >= 0 AND (${table.soldQty} + ${table.reservedQty}) <= ${table.totalQty}`,
    ),
  ],
);

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 40 }).notNull(),
    discountType: promoDiscountTypeEnum("discount_type").notNull(),
    discountValue: integer("discount_value").notNull(),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").default(0).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("promo_codes_event_code_unique").on(table.eventId, table.code),
    check("promo_codes_value_check", sql`${table.discountValue} > 0 AND ${table.usedCount} >= 0`),
  ],
);

// ============================================================================
// COMMANDES, PAIEMENTS, BILLETS & CONTRÔLE D'ACCÈS
// ============================================================================

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicToken: varchar("public_token", { length: 48 }).notNull(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    buyerName: varchar("buyer_name", { length: 160 }).notNull(),
    buyerPhone: varchar("buyer_phone", { length: 32 }).notNull(),
    buyerEmail: varchar("buyer_email", { length: 255 }),
    promoCodeId: uuid("promo_code_id").references(() => promoCodes.id, { onDelete: "set null" }),
    subtotalXof: integer("subtotal_xof").notNull(),
    discountXof: integer("discount_xof").default(0).notNull(),
    buyerFeeXof: integer("buyer_fee_xof").default(0).notNull(),
    platformCommissionXof: integer("platform_commission_xof").default(0).notNull(),
    totalXof: integer("total_xof").notNull(),
    currency: char("currency", { length: 3 }).default("XOF").notNull(),
    status: orderStatusEnum("status").default("PENDING").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("orders_public_token_unique").on(table.publicToken),
    index("orders_event_status_idx").on(table.eventId, table.status),
    index("orders_pending_expiry_idx").on(table.status, table.expiresAt),
  ],
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  ticketTierId: uuid("ticket_tier_id")
    .notNull()
    .references(() => ticketTiers.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPriceXof: integer("unit_price_xof").notNull(),
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    provider: varchar("provider", { length: 40 }).notNull(), // SANDBOX | PAWAPAY | CINETPAY | FEDAPAY | WAVE
    providerRef: varchar("provider_ref", { length: 160 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 120 }).notNull(),
    method: varchar("method", { length: 32 }).notNull(),
    amountXof: integer("amount_xof").notNull(),
    status: paymentStatusEnum("status").default("INITIATED").notNull(),
    rawWebhookPayload: jsonb("raw_webhook_payload"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("payments_provider_ref_unique").on(table.providerRef),
    uniqueIndex("payments_idempotency_unique").on(table.idempotencyKey),
  ],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    ticketTierId: uuid("ticket_tier_id")
      .notNull()
      .references(() => ticketTiers.id, { onDelete: "restrict" }),
    attendeeName: varchar("attendee_name", { length: 160 }).notNull(),
    shortCode: varchar("short_code", { length: 24 }).notNull(),
    qrPayload: text("qr_payload").notNull(),
    pdfR2Key: text("pdf_r2_key"),
    status: ticketStatusEnum("status").default("VALID").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tickets_short_code_unique").on(table.shortCode),
    index("tickets_event_idx").on(table.eventId, table.status),
  ],
);

export const scanSessions = pgTable(
  "scan_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    gateLabel: varchar("gate_label", { length: 100 }).notNull(),
    accessCodeHash: text("access_code_hash").notNull(),
    isRevoked: boolean("is_revoked").default(false).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("scan_sessions_event_idx").on(table.eventId)],
);

export const checkins = pgTable(
  "checkins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "restrict" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    scanSessionId: uuid("scan_session_id").references(() => scanSessions.id, {
      onDelete: "set null",
    }),
    gateLabel: varchar("gate_label", { length: 100 }).notNull(),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).defaultNow().notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
    wasOffline: boolean("was_offline").default(false).notNull(),
    deviceId: varchar("device_id", { length: 120 }),
  },
  (table) => [
    // Garantie atomique : un billet ne peut être validé qu'une seule fois
    uniqueIndex("checkins_ticket_unique").on(table.ticketId),
    index("checkins_event_idx").on(table.eventId, table.scannedAt),
  ],
);

// ============================================================================
// GRAND LIVRE COMPTABLE (APPEND-ONLY), REVERSEMENTS & AUDIT
// ============================================================================

export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    amountXof: bigint("amount_xof", { mode: "number" }).notNull(),
    currency: char("currency", { length: 3 }).default("XOF").notNull(),
    method: varchar("method", { length: 32 }).notNull(),
    destinationMasked: varchar("destination_masked", { length: 120 }).notNull(),
    status: payoutStatusEnum("status").default("REQUESTED").notNull(),
    externalReference: varchar("external_reference", { length: 160 }),
    processedByUserId: uuid("processed_by_user_id").references(() => users.id),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("payouts_org_status_idx").on(table.organizationId, table.status),
    check("payouts_positive_amount_check", sql`${table.amountXof} > 0`),
  ],
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "restrict" }),
    payoutId: uuid("payout_id").references(() => payouts.id, { onDelete: "restrict" }),
    entryType: ledgerEntryTypeEnum("entry_type").notNull(),
    /** Montant signé en XOF entier : positif = crédit organisateur, négatif = débit */
    amountXof: bigint("amount_xof", { mode: "number" }).notNull(),
    currency: char("currency", { length: 3 }).default("XOF").notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ledger_org_available_idx").on(table.organizationId, table.availableAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 120 }).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("audit_logs_entity_idx").on(table.entityType, table.entityId)],
);

// ============================================================================
// MODULE VOTES PAYANTS & CONCOURS UEMOA (Miss, Awards, Musique, Créateurs...)
// ============================================================================

export const voteCampaigns = pgTable(
  "vote_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    shortSummary: varchar("short_summary", { length: 280 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 40 }).notNull(),
    status: varchar("status", { length: 24 }).default("OPEN").notNull(), // OPEN | PAUSED | CLOSED
    isFeatured: boolean("is_featured").default(false).notNull(),
    showLiveResults: boolean("show_live_results").default(true).notNull(),
    countryCode: char("country_code", { length: 2 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    unitVotePriceXof: integer("unit_vote_price_xof").default(200).notNull(),
    commissionBps: integer("commission_bps").default(800).notNull(),
    coverImageKey: text("cover_image_key"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("vote_campaigns_slug_unique").on(table.slug),
    index("vote_campaigns_status_idx").on(table.status, table.countryCode),
  ],
);

export const voteCandidates = pgTable(
  "vote_candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => voteCampaigns.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 24 }).notNull(),
    name: varchar("name", { length: 140 }).notNull(),
    subtitle: varchar("subtitle", { length: 140 }),
    bio: text("bio"),
    photoKey: text("photo_key"),
    votesCount: integer("votes_count").default(0).notNull(),
    grossRaisedXof: bigint("gross_raised_xof", { mode: "number" }).default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("vote_candidates_campaign_idx").on(table.campaignId)],
);

export const voteTransactions = pgTable(
  "vote_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    receiptToken: varchar("receipt_token", { length: 32 }).notNull(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => voteCampaigns.id, { onDelete: "restrict" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => voteCandidates.id, { onDelete: "restrict" }),
    votesCount: integer("votes_count").notNull(),
    totalPaidXof: integer("total_paid_xof").notNull(),
    platformCommissionXof: integer("platform_commission_xof").notNull(),
    organizerNetXof: integer("organizer_net_xof").notNull(),
    voterName: varchar("voter_name", { length: 140 }),
    voterPhone: varchar("voter_phone", { length: 32 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 32 }).notNull(),
    paymentProviderRef: varchar("payment_provider_ref", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("vote_tx_receipt_unique").on(table.receiptToken),
    index("vote_tx_campaign_idx").on(table.campaignId, table.createdAt),
  ],
);

