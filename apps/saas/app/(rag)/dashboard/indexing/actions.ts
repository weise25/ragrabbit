"use server";

import { authActionClient } from "@repo/actions";
import { UnauthorizedError } from "@repo/core";
import db from "@repo/db";
import { and, asc, count, desc, eq, inArray, sql } from "@repo/db/drizzle";
import { Indexed, indexedTable, normalizeUrl } from "@repo/db/schema";
import { generateEmbeddingsDb } from "@repo/rag/indexing/db";
import { processDbItem, processWithRetry } from "@repo/rag/processing/db";
import { scrapeDbItem } from "@repo/rag/scraping/db";
import { revalidatePath } from "next/cache";
import {
  addCrawlSchema,
  addIndexSchema,
  removeManyIndexesSchema,
  runIndexAllSchema,
  runIndexingSchema,
} from "./actions.schema";
import { jobs } from "./jobs";

/** Authorization check */
async function canRunIndexing(ids: number[], orgId: number) {
  const indexed = await db
    .select({ id: indexedTable.id })
    .from(indexedTable)
    .where(and(inArray(indexedTable.id, ids.map(Number)), eq(indexedTable.organizationId, orgId)));

  if (indexed.length !== ids.length) {
    throw new UnauthorizedError("Some indexes do not belong to this organization");
  }
}

export const addIndexAction = authActionClient
  .schema(addIndexSchema)
  .metadata({ name: "addIndex" })
  .action(async ({ parsedInput: { urls }, ctx }) => {
    const index = await db
      .insert(indexedTable)
      .values(
        urls
          .filter((url) => url.value)
          .map((url) => ({
            url: url.value,
            normalizedUrl: normalizeUrl(url.value),
            organizationId: ctx.session.user.organizationId,
          }))
      )
      .returning();

    await jobs.triggerProcessing(
      index.map((i) => i.id),
      ctx.session.user.organizationId
    );
    revalidatePath("/dashboard/indexing");
    return { success: true, data: index };
  });

export const removeManyIndexesAction = authActionClient
  .schema(removeManyIndexesSchema)
  .metadata({ name: "removeManyIndexes" })
  .action(async ({ parsedInput: { ids }, ctx }) => {
    await db
      .delete(indexedTable)
      .where(and(inArray(indexedTable.id, ids), eq(indexedTable.organizationId, ctx.session.user.organizationId)));
    revalidatePath("/dashboard/indexing");
    return { success: true };
  });

export const runEmbeddingsAction = authActionClient
  .schema(runIndexingSchema)
  .metadata({ name: "runEmbeddings" })
  .action(async ({ parsedInput: { ids }, ctx }) => {
    await canRunIndexing(ids, ctx.session.user.organizationId);

    if (ids.length == 1) {
      await generateEmbeddingsDb(ids[0]);
      revalidatePath("/dashboard/indexing/" + ids[0]);
      revalidatePath("/dashboard/indexing");
    } else {
      await jobs.triggerEmbeddings(ids, ctx.session.user.organizationId);
      revalidatePath("/dashboard/indexing");
    }
    return { success: true };
  });

export const runScrapingAction = authActionClient
  .schema(runIndexingSchema)
  .metadata({ name: "runScraping" })
  .action(async ({ parsedInput: { ids }, ctx }) => {
    await canRunIndexing(ids, ctx.session.user.organizationId);

    if (ids.length == 1) {
      // Run the code directly for quick result:
      const result = await scrapeDbItem(ids[0]);
      revalidatePath("/dashboard/indexing/" + ids[0]);
      return { success: true, result };
    } else {
      await jobs.triggerGetContent(ids, ctx.session.user.organizationId);
      revalidatePath("/dashboard/indexing");
      return { success: true };
    }
  });

export const runProcessingAction = authActionClient
  .schema(runIndexingSchema)
  .metadata({ name: "runProcessing" })
  .action(async ({ parsedInput: { ids }, ctx }) => {
    await canRunIndexing(ids, ctx.session.user.organizationId);
    await jobs.triggerProcessing(ids, ctx.session.user.organizationId);
    revalidatePath("/dashboard/indexing");
    return { success: true };
  });

export const runProcessingNowAction = authActionClient
  .metadata({ name: "runProcessingNow" })
  .action(async ({ ctx }) => {
    const pending = await db
      .select({ count: count() })
      .from(indexedTable)
      .where(
        and(
          inArray(indexedTable.status, ["PENDING", "SCRAPED"]),
          eq(indexedTable.organizationId, ctx.session.user.organizationId)
        )
      );

    if (pending[0].count == 0) {
      return { success: true, count: 0 };
    }

    const next = await db
      .select({ id: indexedTable.id })
      .from(indexedTable)
      .where(
        and(
          inArray(indexedTable.status, ["PENDING", "SCRAPED"]),
          eq(indexedTable.organizationId, ctx.session.user.organizationId)
        )
      )
      .limit(1);

    const processed = await processWithRetry(next[0].id);
    return { success: processed.success, processedIndexId: next[0].id, count: pending[0].count - 1 };
  });

export const getPendingCountAction = authActionClient.metadata({ name: "getPendingCount" }).action(async ({ ctx }) => {
  const result = await db
    .select({ count: count() })
    .from(indexedTable)
    .where(inArray(indexedTable.status, ["PENDING", "SCRAPED"]));
  return { count: result[0].count };
});

export const runIndexAllAction = authActionClient
  .schema(runIndexAllSchema)
  .metadata({ name: "runIndexAll" })
  .action(async ({ parsedInput: { orgId }, ctx }) => {
    if (orgId !== ctx.session.user.organizationId) {
      throw new UnauthorizedError("You are not authorized to index all indexes for this organization");
    }
    await jobs.triggerIndexAll(orgId);
    revalidatePath("/dashboard/indexing");
    return { success: true };
  });

export const addCrawlAction = authActionClient
  .schema(addCrawlSchema)
  .metadata({ name: "addCrawl" })
  .action(async ({ parsedInput: { url, isSitemap, scrapeOptions }, ctx }) => {
    const index = await db
      .insert(indexedTable)
      .values({
        url,
        normalizedUrl: normalizeUrl(url),
        isSitemap,
        doCrawl: true,
        organizationId: ctx.session.user.organizationId,
        scrapeOptions: scrapeOptions,
      } as any)
      .returning();

    await jobs.triggerProcessing([index[0].id], ctx.session.user.organizationId);
    revalidatePath("/dashboard/indexing");
    return { success: true, data: index };
  });

export const getAllIndexes = authActionClient.metadata({ name: "getAllIndexes" }).action(async ({ ctx }) => {
  return (await db
    .select()
    .from(indexedTable)
    .where(eq(indexedTable.organizationId, ctx.session.user.organizationId))
    .orderBy(
      desc(indexedTable.doCrawl),
      desc(sql`${indexedTable.foundFromIndexId} IS NULL`),
      asc(indexedTable.createdAt)
    )) as Indexed[];
});
