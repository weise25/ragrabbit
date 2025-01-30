"use server";

import { revalidatePath } from "next/cache";
import db from "@repo/db";
import { indexedTable, llamaindexEmbedding } from "@repo/db/schema";
import { eq, sql, count } from "@repo/db/drizzle";
import { authActionClient } from "@repo/actions";

export async function revalidateCache(organizationId: number) {
  revalidatePath(`/llms.txt`);
  revalidatePath(`/llms-full.txt`);
}

export const getLlmStats = authActionClient.metadata({ name: "getLlmStats" }).action(async ({ ctx }) => {
  const stats = await db
    .select({
      totalIndexed: count(indexedTable.id),
      totalTokens: sql<number>`sum((${llamaindexEmbedding.metadata} ->> 'tokens')::int)`,
      totalSizeBytes: sql<number>`sum(LENGTH(${llamaindexEmbedding.document}))`,
      lastUpdated: sql<Date>`max(${indexedTable.updatedAt})`,
    })
    .from(indexedTable)
    .leftJoin(llamaindexEmbedding, eq(indexedTable.id, llamaindexEmbedding.contentId))
    .where(eq(indexedTable.organizationId, ctx.session.user.organizationId))
    .limit(1);

  return {
    totalIndexed: stats[0]?.totalIndexed ?? 0,
    totalTokens: stats[0]?.totalTokens ?? 0,
    totalSizeBytes: stats[0]?.totalSizeBytes ?? 0,
    lastUpdated: stats[0]?.lastUpdated ?? null,
  };
});
