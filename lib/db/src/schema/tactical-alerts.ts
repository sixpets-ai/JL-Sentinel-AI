import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { globalUsers } from "./global-command";

export const tacticalAlerts = pgTable("tactical_demo_alerts", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => globalUsers.id),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertTacticalAlertSchema = createInsertSchema(tacticalAlerts).omit({ createdAt: true });
export type TacticalAlertRecord = typeof tacticalAlerts.$inferSelect;
