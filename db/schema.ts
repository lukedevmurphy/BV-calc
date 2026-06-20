import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { ProposalPayload } from "@/lib/types";

export const proposals = pgTable("proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Denormalized for the list view; the source of truth is payload.company. */
  companyName: text("company_name").notNull(),
  /** Google email of the signed-in user who first created this case. */
  createdByEmail: text("created_by_email"),
  payload: jsonb("payload").$type<ProposalPayload>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProposalRow = typeof proposals.$inferSelect;

/** One row per Google sign-in — the audit trail of who entered, from where,
 *  and when. Written from /api/track/login on the first authenticated request
 *  of each browser session. */
export const logins = pgTable("logins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  name: text("name"),
  ipAddress: text("ip_address"),
  city: text("city"),
  region: text("region"),
  country: text("country"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LoginRow = typeof logins.$inferSelect;
