import { UserError } from "@repo/core";
import db from "@repo/db";
import { eq } from "@repo/db/drizzle";
import { Indexed, indexedTable } from "@repo/db/schema";
import { logger } from "@repo/logger";
import { generateEmbeddings } from "../indexing/llamaindex";
import { scrapeDbItem } from "../scraping/db";
import { crawlDbItem } from "../scraping/dbCrawl";
import { setTimeout } from "timers/promises";

export type ProcessResult = {
  newIndexedIds: number[];
  success: boolean;
  error?: string;
};

export async function processWithRetry(indexedId: number, maxRetries = 1): Promise<ProcessResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await processDbItem(indexedId);
    } catch (e) {
      logger.error("Error processing content", { indexedId, error: e.message });
      if (i === maxRetries - 1) {
        return await saveDbItemFailure(indexedId, e);
      } else {
        await setTimeout(1000 * (i + 1));
      }
    }
  }
}

export async function processDbItem(indexedId: number): Promise<ProcessResult> {
  logger.info("Processing content", { indexedId });

  const indexed = await db.query.indexedTable.findFirst({
    where: eq(indexedTable.id, indexedId),
  });
  if (!indexed) {
    throw new UserError("Index page not found");
  }

  await db
    .update(indexedTable)
    .set({
      status: "PROCESSING",
      indexedAt: new Date(),
    } as Indexed)
    .where(eq(indexedTable.id, indexed.id));

  let newIndexedIds = [];

  if (indexed.doCrawl && indexed.isSitemap) {
    // NB: only sitemap pages are crawled, normal pages are crawled during scraping
    logger.info("Crawling from item", { indexedId, isSitemap: indexed.isSitemap });
    //Fetch all pages urls:
    await crawlDbItem(indexed.id);

    const newPages = await db
      .update(indexedTable)
      .set({
        status: "DONE",
        indexedAt: new Date(),
      } as Indexed)
      .where(eq(indexedTable.id, indexed.id))
      .returning();

    newIndexedIds = newPages.map((p) => p.id);
  } else {
    //Fetch page content and generate embeddings:
    const { indexed, scrapeData, success, newIndexedIds: newIndexedIdsFromScrape } = await scrapeDbItem(indexedId);

    if (!scrapeData || !scrapeData.content || !success) {
      logger.info("Skipping page", { indexedId });
      return {
        newIndexedIds: [],
        success: true,
      };
    }
    newIndexedIds = newIndexedIdsFromScrape;

    const { title, content, description, links } = scrapeData;
    await generateEmbeddings(content, {
      id: indexed.id.toString(),
      url: indexed.url,
      title,
      description,
      organizationId: indexed.organizationId,
    });

    await db
      .update(indexedTable)
      .set({
        title,
        description,
        status: "DONE",
        indexedAt: new Date(),
      } as Indexed)
      .where(eq(indexedTable.id, indexed.id));
  }

  return {
    newIndexedIds,
    success: true,
  };
}

export async function saveDbItemFailure(indexedId: number, error: Error): Promise<ProcessResult> {
  logger.error("Error processing content", { indexedId, error: error.message });
  await db
    .update(indexedTable)
    .set({
      status: "ERROR",
      error: error.message,
    } as Indexed)
    .where(eq(indexedTable.id, indexedId));

  return {
    newIndexedIds: [],
    success: false,
    error: error.message,
  };
}
