"use server";

import { authActionClient } from "@repo/actions";
import db from "@repo/db";
import { and, asc, count, eq, inArray, lt, or } from "@repo/db/drizzle";
import { indexedTable } from "@repo/db/schema";
import { processWithRetry } from "@repo/rag/processing/db";

const REPROCESS_STUCK_AFTER_MS = 10 * 60 * 1000;

export async function runProcessingNow(orgId: number) {
  const pending = await db
    .select({ count: count() })
    .from(indexedTable)
    .where(
      and(
        or(
          inArray(indexedTable.status, ["PENDING", "SCRAPED", "PENDING_CLEAN"]),
          and(eq(indexedTable.status, "PROCESSING"), lt(indexedTable.updatedAt, new Date(Date.now() - 10 * 60 * 1000)))
        ),
        eq(indexedTable.organizationId, orgId)
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
        or(
          inArray(indexedTable.status, ["PENDING", "SCRAPED", "PENDING_CLEAN"]),
          and(
            eq(indexedTable.status, "PROCESSING"),
            lt(indexedTable.updatedAt, new Date(Date.now() - REPROCESS_STUCK_AFTER_MS))
          )
        ),
        eq(indexedTable.organizationId, orgId)
      )
    )
    .orderBy(asc(indexedTable.status))
    .limit(1);

  if (next.length === 0) {
    return { success: true, count: 0 };
  }

  const processed = await processWithRetry(next[0].id);
  const newPending = processed?.newIndexedIds?.length || 0;
  return { success: processed.success, processedIndexId: next[0].id, count: pending[0].count - 1 + newPending };
}

export async function getPendingCount(orgId: number) {
  const result = await db
    .select({ count: count() })
    .from(indexedTable)
    .where(
      and(
        or(
          inArray(indexedTable.status, ["PENDING", "SCRAPED", "PENDING_CLEAN"]),
          and(
            eq(indexedTable.status, "PROCESSING"),
            lt(indexedTable.updatedAt, new Date(Date.now() - REPROCESS_STUCK_AFTER_MS))
          )
        ),
        eq(indexedTable.organizationId, orgId)
      )
    );
  return { count: result[0].count };
}
