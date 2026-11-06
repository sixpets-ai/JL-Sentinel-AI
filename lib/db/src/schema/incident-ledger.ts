import { pgTable, serial, integer, text, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

export const incidentLedger = pgTable("incident_ledger", {
  id: serial("id").primaryKey(),
  stream: text("stream").notNull(),
  sequence: integer("sequence").notNull().default(0),
  eventType: text("event_type", { enum: ["recorded", "route", "report", "amendment", "evidence"] }).notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  actorId: integer("actor_id"),
  actor: text("actor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  dataCanonical: text("data_canonical").notNull().default(""),
  payloadHash: text("payload_hash").notNull().default(""),
  previousHash: text("previous_hash").notNull().default(""),
  hash: text("hash").notNull().default(""),
  canonical: text("canonical").notNull().default(""),
}, table => [
  uniqueIndex("incident_ledger_stream_sequence").on(table.stream, table.sequence),
  index("incident_ledger_stream").on(table.stream),
]);

// Validation challenges are ephemeral authentication state, NOT incident history.
// Only a digest of the one-use token is stored. Consuming it is transactional.
export const amendmentValidations = pgTable("amendment_validations", {
  tokenHash: text("token_hash").primaryKey(),
  stream: text("stream").notNull(),
  userId: integer("user_id").notNull(),
  originalHash: text("original_hash").notNull(),
  intentHash: text("intent_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});
