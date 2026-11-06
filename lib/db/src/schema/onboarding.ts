import { pgTable, integer, text, timestamp, jsonb, uuid, serial, index } from "drizzle-orm/pg-core";
import { globalUsers } from "./global-command";

export const onboardingProfiles = pgTable("onboarding_profiles", {
  userId: integer("user_id").primaryKey().references(() => globalUsers.id),
  requestedRole: text("requested_role", { enum: ["ciudadano", "patrulla", "analista", "director"] }).notNull(),
  registrationId: text("registration_id").notNull().default(""),
  corporation: text("corporation").notNull().default(""),
  consentVersion: text("consent_version").notNull(),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
  reviewStatus: text("review_status", { enum: ["pending", "approved", "rejected"] }).notNull(),
  reviewNote: text("review_note").notNull().default(""),
  reviewedBy: integer("reviewed_by").references(() => globalUsers.id),
});

export const citizenCases = pgTable("citizen_cases", {
  id: uuid("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => globalUsers.id),
  original: jsonb("original").$type<{
    folio: string; categoryCode: string; categoryLabel: string; description: string;
    zone: string; point: { lat: number; lng: number }; ownerUsername: string; createdAt: string;
  }>().notNull(),
  originalHash: text("original_hash").notNull(),
  originalCanonical: text("original_canonical").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("citizen_cases_owner_created").on(t.ownerId, t.createdAt)]);

export const citizenEvents = pgTable("citizen_case_events", {
  id: serial("id").primaryKey(),
  caseId: uuid("case_id").notNull().references(() => citizenCases.id),
  actorId: integer("actor_id").notNull().references(() => globalUsers.id),
  kind: text("kind", { enum: ["dispatch", "completed", "evidence"] }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  previousHash: text("previous_hash").notNull(),
  hash: text("hash").notNull(),
  canonical: text("canonical").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("citizen_events_case_order").on(t.caseId, t.id)]);

// Temporary upload tickets are mutable. Only finalized receipts enter the
// append-only case history. No biometric images are accepted by this schema.
export const citizenUploads = pgTable("citizen_uploads", {
  id: uuid("id").primaryKey(),
  caseId: uuid("case_id").notNull().references(() => citizenCases.id),
  ownerId: integer("owner_id").notNull().references(() => globalUsers.id),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  sha256: text("sha256").notNull(),
  temporaryPath: text("temporary_path").notNull(),
  finalPath: text("final_path"),
  generation: text("generation"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
});
