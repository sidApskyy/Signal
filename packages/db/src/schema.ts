import {
  pgTable, uuid, text, timestamp, integer, bigint, boolean, jsonb,
  uniqueIndex, index, pgEnum,
} from "drizzle-orm/pg-core";

export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "analyst", "viewer"]);
export const envEnum = pgEnum("domain_environment", ["production", "staging", "development"]);
export const verificationEnum = pgEnum("verification_method", ["dns_txt", "html_file", "meta_tag"]);
export const consentModeEnum = pgEnum("consent_mode", ["required", "anonymous", "off"]);
export const botClassEnum = pgEnum("bot_class", ["human", "known_bot", "suspected_bot", "internal"]);
export const eventKindEnum = pgEnum("event_kind", ["custom", "conversion"]);

// ─── Identity & tenancy ──────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  isPlatformOwner: boolean("is_platform_owner").notNull().default(false),
  mfaSecret: text("mfa_secret"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("auth_sessions_user_idx").on(t.userId)]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").notNull().default("viewer"),
  invitedBy: uuid("invited_by"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("org_members_unique").on(t.organizationId, t.userId),
  index("org_members_user_idx").on(t.userId),
]);

// ─── Projects ────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  environment: envEnum("environment").notNull().default("production"),
  timezone: text("timezone").notNull().default("UTC"),
  retentionDays: integer("retention_days").notNull().default(365),
  consentMode: consentModeEnum("consent_mode").notNull().default("anonymous"),
  keepNetworkPrefix: boolean("keep_network_prefix").notNull().default(false),
  sensitivePathPatterns: text("sensitive_path_patterns").array().notNull().default([]),
  engagementWeights: jsonb("engagement_weights").notNull().default({
    homepage_viewed: 1, service_page_viewed: 3, returning_service_page: 5,
    cta_clicked: 5, contact_page_viewed: 5, form_submitted: 20,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("projects_org_idx").on(t.organizationId)]);

export const projectDomains = pgTable("project_domains", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  host: text("host").notNull(),
  environment: envEnum("environment").notNull().default("production"),
  verificationMethod: verificationEnum("verification_method").notNull().default("dns_txt"),
  verificationToken: text("verification_token").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("project_domains_unique").on(t.projectId, t.host),
  index("project_domains_host_idx").on(t.host),
]);

export const projectKeys = pgTable("project_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  publicKey: text("public_key").notNull().unique(),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("project_keys_project_idx").on(t.projectId)]);

export const eventDefinitions = pgTable("event_definitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: eventKindEnum("kind").notNull().default("custom"),
  propsSchema: jsonb("props_schema"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("event_defs_unique").on(t.projectId, t.name)]);

export const savedReports = pgTable("saved_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  definition: jsonb("definition").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  target: text("target"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("audit_org_idx").on(t.organizationId, t.createdAt)]);

// ─── Analytics data ─────────────────────────────────────────────────────────

export const visitors = pgTable("visitors", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  visitorId: text("visitor_id").notNull(), // client anonymous UUID
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  sessionCount: integer("session_count").notNull().default(0),
  pageviewCount: integer("pageview_count").notNull().default(0),
  eventCount: integer("event_count").notNull().default(0),
  countryCode: text("country_code"),
  region: text("region"),
  city: text("city"),
  deviceCategory: text("device_category"),
  browser: text("browser"),
  os: text("os"),
  engagementScore: integer("engagement_score").notNull().default(0),
  consentStatus: text("consent_status").notNull().default("unknown"),
}, (t) => [
  uniqueIndex("visitors_unique").on(t.projectId, t.visitorId),
  index("visitors_project_idx").on(t.projectId, t.lastSeenAt),
  index("visitors_org_idx").on(t.organizationId),
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
  clientSessionId: text("client_session_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  entryPage: text("entry_page"),
  exitPage: text("exit_page"),
  pageCount: integer("page_count").notNull().default(0),
  eventCount: integer("event_count").notNull().default(0),
  durationS: integer("duration_s").notNull().default(0),
  referrerHost: text("referrer_host"),
  channel: text("channel"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  countryCode: text("country_code"),
  region: text("region"),
  city: text("city"),
  deviceCategory: text("device_category"),
  browser: text("browser"),
  os: text("os"),
  botClass: botClassEnum("bot_class").notNull().default("human"),
}, (t) => [
  uniqueIndex("sessions_unique").on(t.projectId, t.clientSessionId),
  index("sessions_project_time_idx").on(t.projectId, t.lastSeenAt),
  index("sessions_visitor_idx").on(t.visitorId),
  index("sessions_org_idx").on(t.organizationId),
]);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
  clientEventId: text("client_event_id").notNull(),
  name: text("name").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  pagePath: text("page_path"),
  props: jsonb("props"),
}, (t) => [
  uniqueIndex("events_dedup_unique").on(t.projectId, t.clientEventId),
  index("events_project_time_idx").on(t.projectId, t.occurredAt),
  index("events_name_idx").on(t.projectId, t.name),
  index("events_session_idx").on(t.sessionId),
  index("events_org_idx").on(t.organizationId),
]);

export const pageViews = pgTable("page_views", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  title: text("title"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  timeOnPageMs: bigint("time_on_page_ms", { mode: "number" }),
}, (t) => [
  index("pv_path_idx").on(t.projectId, t.path),
  index("pv_project_time_idx").on(t.projectId, t.occurredAt),
  index("pv_session_idx").on(t.sessionId),
]);

export const attributions = pgTable("attributions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  source: text("source"),
  medium: text("medium"),
  campaign: text("campaign"),
  referrerHost: text("referrer_host"),
  landingPage: text("landing_page"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("attr_session_idx").on(t.sessionId)]);

export const consentRecords = pgTable("consent_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // granted | revoked
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("consent_visitor_idx").on(t.visitorId, t.createdAt)]);

export const geoLocations = pgTable("geo_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  network: text("network").notNull().unique(), // truncated /24 prefix cache
  countryCode: text("country_code"),
  region: text("region"),
  city: text("city"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyAggregates = pgTable("daily_aggregates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD UTC
  dimension: text("dimension").notNull(), // overall | country | device | source | page
  dimensionValue: text("dimension_value").notNull(),
  visitors: integer("visitors").notNull().default(0),
  sessions: integer("sessions").notNull().default(0),
  pageViews: integer("page_views").notNull().default(0),
  events: integer("events").notNull().default(0),
}, (t) => [
  uniqueIndex("daily_agg_unique").on(t.projectId, t.date, t.dimension, t.dimensionValue),
  index("daily_agg_project_date_idx").on(t.projectId, t.date),
]);
