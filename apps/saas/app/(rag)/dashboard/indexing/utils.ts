"use server";

import { authActionClient } from "@repo/actions";
import db from "@repo/db";
import { and, asc, count, eq, inArray, lt, or } from "@repo/db/drizzle";
import { indexedTable, IndexStatus } from "@repo/db/schema";
import { processWithRetry } from "@repo/rag/processing/db";

const REPROCESS_STUCK_AFTER_MS = 10 * 60 * 1000;

const whereConditions = (orgId: number) =>
  and(
    or(
      inArray(indexedTable.status, ["PENDING", "SCRAPED", "PENDING_CLEAN"]),
      and(
        eq(indexedTable.status, "PROCESSING"),
        lt(indexedTable.updatedAt, new Date(Date.now() - REPROCESS_STUCK_AFTER_MS))
      )
    ),
    eq(indexedTable.organizationId, orgId)
  );

export async function runProcessingNow(orgId: number) {
  const next = await db
    .select({ id: indexedTable.id, status: indexedTable.status })
    .from(indexedTable)
    .where(whereConditions(orgId))
    .orderBy(asc(indexedTable.status)) // Due to natural sorting PENDING_CLEAN will be executed last
    .limit(1);

  if (next.length === 0) {
    return { success: true, count: 0 };
  }

  const processed = await processWithRetry(next[0].id, next[0].status as IndexStatus);
  const pendingCount = await getPendingCount(orgId);
  return { success: processed.success, processedIndexId: next[0].id, count: pendingCount.count };
}

export async function getPendingCount(orgId: number) {
  const result = await db.select({ count: count() }).from(indexedTable).where(whereConditions(orgId));
  return { count: result[0].count };
}
