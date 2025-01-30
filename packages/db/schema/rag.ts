import { relations } from "drizzle-orm/relations";
import { ExtraConfigColumn, index, pgEnum, unique, varchar } from "drizzle-orm/pg-core";
import { serial } from "drizzle-orm/pg-core";
import { boolean, timestamp, pgTable, text, primaryKey, integer } from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel, SQL, sql, ColumnDataType, ColumnBaseConfig } from "drizzle-orm";
import { organizationsTable } from "./auth";
import { uuid } from "drizzle-orm/pg-core";
import { jsonb } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { env } from "../env.mjs";

export type PgExtraConfigJson = ExtraConfigColumn<ColumnBaseConfig<ColumnDataType, string>>;

export function extraJsonFieldDeep(column: PgExtraConfigJson, keys: Array<string | number>): SQL {
  return sql.raw(`("${column.name}" ->> '{${(keys as string[]).join(",")}}')`);
}

// RAG

export enum IndexStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SCRAPED = "SCRAPED",
  DONE = "DONE",
  PENDING_CLEAN = "PENDING_CLEAN",
  SKIPPED = "SKIPPED",
  ERROR = "ERROR",
  OUTDATED = "OUTDATED",
}

export const indexStatusEnum = pgEnum("index_status", [
  "PENDING",
  "PROCESSING",
  "SCRAPED",
  "DONE",
  "PENDING_CLEAN", // Must be after DONE to be processed after all other jobs complete
  "SKIPPED",
  "ERROR",
  "OUTDATED",
]);

export const indexedTable = pgTable(
  "indexed",
  {
    id: serial().primaryKey(),
    organizationId: integer().notNull(),
    url: varchar().notNull(),
    normalizedUrl: varchar().notNull(),
    canonicalUrl: varchar(),
    title: varchar(),
    description: text(),

    scrapeOptions: jsonb()
      .$type<{
        stripLinks?: boolean;
        stripImages?: boolean;
        stripHeader?: boolean;
        stripFooter?: boolean;
        allowSubdomains?: boolean;
        maxDepth?: number;
      }>()
      .default({}),

    /**
     * If this content should be the start of a crawling run
     */
    doCrawl: boolean().default(false).notNull(),
    isSitemap: boolean().default(false).notNull(),
    /**
     * If this content was found during a crawl, this is the original page from which the link was found
     */
    foundFromIndexId: integer().references(() => indexedTable.id, { onDelete: "cascade" }),
    depth: integer().default(0).notNull(),
    status: indexStatusEnum().default("PENDING").notNull(),
    error: text(),
    hash: varchar(),
    skip: boolean().default(false).notNull(),
    skipReason: text(),
    reindexAt: timestamp(),
    indexedAt: timestamp(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp(),
  },
  (table) => {
    return {
      uniqueOrgUrl: unique().on(table.organizationId, table.normalizedUrl),
      uniqueHash: unique().on(table.organizationId, table.hash),
      orgFoundFromIdx: index().on(table.organizationId, table.foundFromIndexId),
      idxStatus: index().on(table.organizationId, table.status),
    };
  }
);

export function normalizeUrl(url: string, baseUrl?: string) {
  try {
    // Avoid error with protocol-relative urls:
    if (url.startsWith("//")) {
      url = "https:" + url;
    }
    const urlParts = new URL(url.toLowerCase(), baseUrl);
    return "//" + urlParts.hostname.replace("www.", "") + urlParts.pathname;
  } catch (e) {
    throw new Error(`Error normalizing url: ${url}, ${e}`);
  }
}

export type Indexed = InferSelectModel<typeof indexedTable>;
export type NewIndexed = InferInsertModel<typeof indexedTable>;

export const indexedRelations = relations(indexedTable, ({ one, many }) => ({
  foundFromIndex: one(indexedTable, {
    fields: [indexedTable.foundFromIndexId],
    references: [indexedTable.id],
  }),
  indexedContent: one(indexedContentTable),
}));

export const indexedContentTable = pgTable(
  "indexed_content",
  {
    id: serial("id").primaryKey(),
    indexId: integer()
      .notNull()
      .references(() => indexedTable.id, { onDelete: "cascade" }),
    content: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp(),
  },
  (table) => ({
    uniqueIndexId: unique().on(table.indexId),
  })
);

export type IndexedContent = InferSelectModel<typeof indexedContentTable>;
export type NewIndexedContent = InferInsertModel<typeof indexedContentTable>;

export const indexedContentRelations = relations(indexedContentTable, ({ one }) => ({
  indexed: one(indexedTable, {
    fields: [indexedContentTable.indexId],
    references: [indexedTable.id],
  }),
}));

export const EmbeddingDimensions = {
  openai: 1536,
  baai: 384,
  xenova: 1536,
};

export const llamaindexEmbedding = pgTable(
  "indexed_content_embeddings",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    externalId: varchar("external_id"), // NB: This is not used by llamaindex
    collection: varchar(),
    document: text(),
    metadata: jsonb()
      .$type<{
        contentId?: string;
        organizationId?: number;
        pageTitle?: string;
        pageDescription?: string;
        pageUrl?: string;
        pageKeywords?: string[];
        pageQuestions?: string[];
        pageEntities?: { name: string; type: string }[];
        tokens?: number;
      }>()
      .default({}),
    // Duplicate contentId from metadata to allow for cascade FK deletion:
    contentId: integer()
      .generatedAlwaysAs(sql`(metadata ->> 'contentId')::int`)
      .references(() => indexedTable.id, { onDelete: "cascade" }),
    embeddings: vector({ dimensions: EmbeddingDimensions[env.EMBEDDING_MODEL] }),
  },
  (table) => {
    return {
      idxLlamaindexEmbeddingCollection: index("idx_llamaindex_embedding_collection").using(
        "btree",
        table.collection.asc().nullsLast()
      ),
      metadataPageId: index("idx_llamaindex_embedding_metadata_page_id").on(
        extraJsonFieldDeep(table.metadata, ["contentId"])
      ),
      organizationId: index("idx_llamaindex_embedding_organization_id").on(
        extraJsonFieldDeep(table.metadata, ["organizationId"])
      ),
      searchIndex: index("search_index").using(
        "gin",
        sql`(
          setweight(to_tsvector('english', ${table.metadata} ->> 'pageUrl'), 'A') ||
          setweight(to_tsvector('english', ${table.metadata} ->> 'pageTitle'), 'B') ||
          setweight(to_tsvector('english', ${table.metadata} ->> 'pageDescription'), 'C') ||
          setweight(to_tsvector('english', ${table.document}), 'D')
        )`
      ),
      //TODO: add support for pg_trgm on dev postgres
      //searchIndexTsquery: index("search_index_tsquery").using("gin", sql`document gin_trgm_ops`),
    };
  }
);
export type LlamaindexEmbedding = InferSelectModel<typeof llamaindexEmbedding>;
export type NewLlamaindexEmbedding = InferInsertModel<typeof llamaindexEmbedding>;

export const widgetConfigTable = pgTable("widget_config", {
  id: serial("id").primaryKey().notNull(),
  organizationId: integer()
    .notNull()
    .unique()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  suggestedQueries: jsonb().$type<string[]>().default([]),
  welcomeMessage: text(),
  logoUrl: varchar(),
});

export type WidgetConfig = InferSelectModel<typeof widgetConfigTable>;
export type NewWidgetConfig = InferInsertModel<typeof widgetConfigTable>;
