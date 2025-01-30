"use server";

import { authActionClient } from "@repo/actions";
import { UnauthorizedError } from "@repo/core";
import db from "@repo/db";
import { and, asc, desc, eq, inArray, sql } from "@repo/db/drizzle";
import { Indexed, indexedTable, normalizeUrl } from "@repo/db/schema";
import { generateEmbeddingsDb } from "@repo/rag/indexing/db";
import { scrapeDbItem } from "@repo/rag/scraping/db";
import { revalidatePath } from "next/cache";
import {
  addCrawlSchema,
  addIndexSchema,
  editSingleIndexSchema,
  removeManyIndexesSchema,
  runIndexAllSchema,
  runIndexingSchema,
  updateCrawlSchema,
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

export const updateIndexAction = authActionClient
  .schema(editSingleIndexSchema)
  .metadata({ name: "updateIndex" })
  .action(async ({ parsedInput: { id, url, clearFoundFrom }, ctx }) => {
    const index = await db
      .update(indexedTable)
      .set({
        url: url,
        normalizedUrl: normalizeUrl(url),
        ...(clearFoundFrom ? { foundFromIndexId: null } : {}),
      })
      .where(and(eq(indexedTable.id, id), eq(indexedTable.organizationId, ctx.session.user.organizationId)))
      .returning();

    if (index.length === 0) {
      throw new UnauthorizedError("Index not found or not authorized");
    }

    await jobs.triggerProcessing([id], ctx.session.user.organizationId);
    revalidatePath("/dashboard/indexing");
    return { success: true, data: index[0] };
  });

export const updateCrawlAction = authActionClient
  .schema(updateCrawlSchema)
  .metadata({ name: "updateCrawl" })
  .action(async ({ parsedInput: { id, url, isSitemap, scrapeOptions }, ctx }) => {
    const index = await db
      .update(indexedTable)
      .set({
        url,
        normalizedUrl: normalizeUrl(url),
        isSitemap,
        scrapeOptions,
      } as any)
      .where(and(eq(indexedTable.id, id), eq(indexedTable.organizationId, ctx.session.user.organizationId)))
      .returning();

    if (index.length === 0) {
      throw new UnauthorizedError("Index not found or not authorized");
    }

    await jobs.triggerProcessing([id], ctx.session.user.organizationId);
    revalidatePath("/dashboard/indexing");
    return { success: true, data: index[0] };
  });
