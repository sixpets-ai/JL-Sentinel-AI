import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const globalUsers = pgTable("global_command_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["ciudadano", "oficial", "director"] }).notNull().default("ciudadano"),
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const globalBriefs = pgTable("global_command_briefs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => globalUsers.id),
  topic: text("topic").notNull(),
  text: text("text").notNull(),
  sourceUrls: jsonb("source_urls").$type<string[]>().notNull(),
  auditStatus: text("audit_status").notNull().default("not_submitted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGlobalUserSchema = createInsertSchema(globalUsers).omit({ id: true, createdAt: true });
export type GlobalCommandUser = typeof globalUsers.$inferSelect;
