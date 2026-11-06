import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const agentPatternCounts = pgTable("agent_pattern_counts", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  observations: integer("observations").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const incidentMutationAttempts = pgTable("incident_mutation_attempts", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().unique(),
  stream: text("stream").notNull(),
  operation: text("operation").notNull(),
  actorId: integer("actor_id").notNull(),
  actor: text("actor").notNull(),
  outcome: text("outcome").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
