import { integer, jsonb, pgEnum, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { organizationsTable } from "./auth";

export const llmstxtTypeEnum = pgEnum("llmstxt_type", ["SINGLE", "TOC"]);

export type LlmstxtOrderedContentIds = {
  contentId?: number;
  excluded?: boolean;
  url?: string;
  childs?: { [order: number]: LlmstxtOrderedContentIds };
};

export const llmstxtTable = pgTable(
  "llmstxt",
  {
    id: serial().primaryKey(),
    organizationId: integer()
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    content: text().notNull().default(""),
    contentToc: text().notNull().default(""),
    orderedContentIds: jsonb().$type<LlmstxtOrderedContentIds[]>().default([]),
    title: text(),
    description: text(),
    type: llmstxtTypeEnum().default("TOC"),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp(),
  },
  (table) => {
    return {
      uniqueOrgType: unique().on(table.organizationId),
    };
  }
);
