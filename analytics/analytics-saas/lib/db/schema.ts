import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import type { BriefData, ReportOutput } from "@/lib/types/brief";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

export const googleTokens = pgTable(
  "google_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    iv: varchar("iv", { length: 255 }).notNull(),
    authTag: varchar("auth_tag", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("google_tokens_user_id_idx").on(table.userId),
  }),
);

export const reportConfigs = pgTable(
  "report_configs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ga4PropertyId: varchar("ga4_property_id", { length: 255 }),
    gscSiteUrl: varchar("gsc_site_url", { length: 255 }),
    gbpLocationId: varchar("gbp_location_id", { length: 255 }),
    // Google Maps Place ID (ChIJ…) resolved once from the website at config
    // creation, then used for deterministic Places review lookups. Null until
    // resolved (or if no public listing matches the site).
    placeId: varchar("place_id", { length: 255 }),
    // Optional list of pinned competitor Place IDs (ChIJ…). Null → auto-discover
    // nearby same-category businesses from the owner's placeId at report time.
    competitorPlaceIds: json("competitor_place_ids").$type<string[]>(),
    businessName: varchar("business_name", { length: 255 }).notNull(),
    businessType: varchar("business_type", { length: 255 }),
    activeChannels: json("active_channels").default(["email"]),
    subscriptionActive: boolean("subscription_active").notNull().default(false),
    recipientEmail: varchar("recipient_email", { length: 255 }),
    recipientPhone: varchar("recipient_phone", { length: 20 }),
    scheduleFrequency: varchar("schedule_frequency", { length: 20 }).notNull().default("monthly"),
    scheduleDayOfMonth: integer("schedule_day_of_month").notNull().default(1),
    scheduleDayOfWeek: integer("schedule_day_of_week").notNull().default(1),
    scheduleTime: varchar("schedule_time", { length: 5 }).notNull().default("09:00"),
    scheduleTimezone: varchar("schedule_timezone", { length: 100 })
      .notNull()
      .default("Australia/Sydney"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("report_configs_user_id_idx").on(table.userId),
  }),
);

export const reportHistory = pgTable(
  "report_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    configId: text("config_id")
      .notNull()
      .references(() => reportConfigs.id, { onDelete: "cascade" }),
    period: varchar("period", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(),
    errorMessage: text("error_message"),
    reportData: json("report_data").$type<ReportOutput>(),
    rawData: json("raw_data").$type<BriefData>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("report_history_user_id_idx").on(table.userId),
    configIdIdx: index("report_history_config_id_idx").on(table.configId),
  }),
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    active: boolean("active").notNull().default(false),
    // Tier slug from lib/plans.ts ("free" | "starter" | "pro"). Drives the
    // site-creation limit. Reset to "free" when the subscription ends.
    plan: varchar("plan", { length: 20 }).notNull().default("free"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
    stripeCustomerIdIdx: index("subscriptions_stripe_customer_id_idx").on(table.stripeCustomerId),
  }),
);

export const teamInvitations = pgTable(
  "team_invitations",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviteeEmail: varchar("invitee_email", { length: 255 }).notNull(),
    token: text("token").notNull().unique(),
    role: varchar("role", { length: 50 }).notNull().default("viewer"),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    ownerIdIdx: index("team_invitations_owner_id_idx").on(table.ownerId),
    tokenIdx: uniqueIndex("team_invitations_token_idx").on(table.token),
  }),
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull().default("viewer"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    ownerIdIdx: index("team_members_owner_id_idx").on(table.ownerId),
    memberIdIdx: index("team_members_member_id_idx").on(table.memberId),
  }),
);

export const teamAuditLogs = pgTable(
  "team_audit_logs",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 100 }).notNull(),
    actorId: text("actor_id").notNull(),
    targetEmail: varchar("target_email", { length: 255 }),
    targetMemberId: text("target_member_id"),
    details: json("details"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    ownerIdIdx: index("team_audit_logs_owner_id_idx").on(table.ownerId),
    createdAtIdx: index("team_audit_logs_created_at_idx").on(table.createdAt),
  }),
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  googleTokens: many(googleTokens),
  reportConfigs: many(reportConfigs),
  reportHistory: many(reportHistory),
  subscription: one(subscriptions),
  teamInvitationsSent: many(teamInvitations),
  teamMembershipsOwned: many(teamMembers, { relationName: "owner" }),
  teamMemberships: many(teamMembers, { relationName: "member" }),
  teamAuditLogs: many(teamAuditLogs),
}));

export const googleTokensRelations = relations(googleTokens, ({ one }) => ({
  user: one(users, {
    fields: [googleTokens.userId],
    references: [users.id],
  }),
}));

export const reportConfigsRelations = relations(reportConfigs, ({ one, many }) => ({
  user: one(users, {
    fields: [reportConfigs.userId],
    references: [users.id],
  }),
  history: many(reportHistory),
}));

export const reportHistoryRelations = relations(reportHistory, ({ one }) => ({
  user: one(users, {
    fields: [reportHistory.userId],
    references: [users.id],
  }),
  config: one(reportConfigs, {
    fields: [reportHistory.configId],
    references: [reportConfigs.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  owner: one(users, {
    fields: [teamInvitations.ownerId],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  owner: one(users, {
    fields: [teamMembers.ownerId],
    references: [users.id],
    relationName: "owner",
  }),
  member: one(users, {
    fields: [teamMembers.memberId],
    references: [users.id],
    relationName: "member",
  }),
}));

export const teamAuditLogsRelations = relations(teamAuditLogs, ({ one }) => ({
  owner: one(users, {
    fields: [teamAuditLogs.ownerId],
    references: [users.id],
  }),
}));
