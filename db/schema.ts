import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { ProposalPayload } from "@/lib/types";

export const proposals = pgTable("proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Denormalized for the list view; the source of truth is payload.company. */
  companyName: text("company_name").notNull(),
  payload: jsonb("payload").$type<ProposalPayload>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProposalRow = typeof proposals.$inferSelect;
