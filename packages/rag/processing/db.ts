import { RateLimitError, UserError } from "@repo/core";
import db from "@repo/db";
import { and, eq } from "@repo/db/drizzle";
import { Indexed, indexedTable, IndexStatus } from "@repo/db/schema";
import { logger } from "@repo/logger";
import { setTimeout } from "timers/promises";
import { generateEmbeddingsDb } from "../indexing/db";
import { generateEmbeddings } from "../indexing/llamaindex";
import { scrapeDbItem } from "../scraping/db";
import { crawlDbItem } from "../scraping/dbCrawl";

export type ProcessResult = {
  newIndexedIds: number[];
  success: boolean;
  error?: string;
};

export async function processWithRetry(
  indexedId: number,
  status?: IndexStatus,
  maxRetries = 1
): Promise<ProcessResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (status == IndexStatus.SCRAPED) {
        return {
          ...(await generateEmbeddingsDb(indexedId)),
          newIndexedIds: [],
        };
      }
      return await processDbItem(indexedId);
    } catch (e) {
      console.error(e);
      logger.error({ indexedId, error: e.message }, "Error processing content");
      if (e instanceof RateLimitError) {
        throw e;
      }
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

  if (indexed.status == "PENDING_CLEAN") {
    return await cleanDbCrawlItem(indexed as Indexed);
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

    if (!success || indexed?.status == "DONE" || indexed?.status == "PENDING_CLEAN") {
      logger.info({ indexedId, success, status: indexed?.status }, "Skipping page");
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
      metadata: scrapeData.metadata,
    });

    await db
      .update(indexedTable)
      .set({
        title,
        description,
        // NB: if is a crawl origin, we mark as pending clean to delete removed pages at the end:
        status: indexed.doCrawl ? "PENDING_CLEAN" : "DONE",
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
  logger.error({ indexedId, error: error.message }, "Error processing content");
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

export async function cleanDbCrawlItem(indexed: Indexed) {
  logger.info("Cleaning completed crawl item", { indexedId: indexed.id });

  // Delete any items that were marked as outdated and were not processed during the crawl
  await db
    .delete(indexedTable)
    .where(and(eq(indexedTable.foundFromIndexId, indexed.id), eq(indexedTable.status, "OUTDATED")));

  // Mark this crawl as complete:
  await db
    .update(indexedTable)
    .set({
      status: "DONE",
      indexedAt: new Date(),
    } as Indexed)
    .where(eq(indexedTable.id, indexed.id));
  return {
    newIndexedIds: [],
    success: true,
  };
}
