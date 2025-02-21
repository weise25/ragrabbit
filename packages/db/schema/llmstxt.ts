import { integer, jsonb, pgEnum, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { organizationsTable } from "./auth";

export const llmstxtTypeEnum = pgEnum("llmstxt_type", ["TOC", "FULL"]);

export type LlmstxtOrderedContentIds = {
  contentId: number;
  childs?: { [order: number]: LlmstxtOrderedContentIds };
};

export const llmstxtTable = pgTable(
  "llmstxt",
  {
    id: serial().primaryKey(),
    organizationId: integer()
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    type: llmstxtTypeEnum().default("FULL").notNull(),
    content: text().notNull(),
    orderedContentIds: jsonb().$type<LlmstxtOrderedContentIds[]>().default([]),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp(),
  },
  (table) => {
    return {
      uniqueOrgType: unique().on(table.organizationId, table.type),
    };
  }
);
