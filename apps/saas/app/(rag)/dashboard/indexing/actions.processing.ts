"use server";

import { authActionClient } from "@repo/actions";
import db from "@repo/db";
import { and, asc, count, eq, inArray } from "@repo/db/drizzle";
import { indexedTable } from "@repo/db/schema";
import { processWithRetry } from "@repo/rag/processing/db";

export const runProcessingNowAction = authActionClient
  .metadata({ name: "runProcessingNow" })
  .action(async ({ ctx }) => {
    const pending = await db
      .select({ count: count() })
      .from(indexedTable)
      .where(
        and(
          inArray(indexedTable.status, ["PENDING", "SCRAPED", "PENDING_CLEAN"]),
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
          inArray(indexedTable.status, ["PENDING", "SCRAPED", "PENDING_CLEAN"]),
          eq(indexedTable.organizationId, ctx.session.user.organizationId)
        )
      )
      .orderBy(asc(indexedTable.status))
      .limit(1);

    const processed = await processWithRetry(next[0].id);
    return { success: processed.success, processedIndexId: next[0].id, count: pending[0].count - 1 };
  });

export const getPendingCountAction = authActionClient.metadata({ name: "getPendingCount" }).action(async ({ ctx }) => {
  const result = await db
    .select({ count: count() })
    .from(indexedTable)
    .where(inArray(indexedTable.status, ["PENDING", "SCRAPED", "PENDING_CLEAN"]));
  return { count: result[0].count };
});
