"use server";

import { revalidatePath } from "next/cache";
import db from "@repo/db";
import { indexedTable, llamaindexEmbedding, llmstxtTable, indexedContentTable } from "@repo/db/schema";
import { llmstxtTypeEnum, LlmstxtOrderedContentIds } from "@repo/db/schema/llmstxt";
import { eq, sql, count, and } from "@repo/db/drizzle";
import { actionClientWithMeta, authActionClient } from "@repo/actions";
import { z } from "zod";
import { getLlmsConfig, getPageTree, TreePage } from "../../utils";

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

export const getIndexedPages = authActionClient.metadata({ name: "getIndexedPages" }).action(async ({ ctx }) => {
  const pages = await getPageTree(ctx.session.user.organizationId);
  return [...pages];
});

const basePageSchema = z.object({
  id: z.number(),
  excluded: z.boolean().optional(),
});

type Page = z.infer<typeof basePageSchema> & {
  children?: Page[];
};

const pageSchema: z.ZodType<Page> = basePageSchema.extend({
  children: z.lazy(() => pageSchema.array()).optional(),
});

const updatePagesOrderSchema = z.object({
  pages: pageSchema.array(),
});

export const updatePagesOrder = authActionClient
  .schema(updatePagesOrderSchema)
  .metadata({ name: "updatePagesOrder" })
  .action(async ({ parsedInput, ctx }) => {
    const convertPage = (page: TreePage): LlmstxtOrderedContentIds => {
      return {
        contentId: page.id,
        excluded: page.excluded,
        childs: page.children?.map(convertPage),
      };
    };
    const orderedContentIds: LlmstxtOrderedContentIds[] = parsedInput.pages.map(convertPage);
    console.log("## update", orderedContentIds[0].childs);
    await db
      .insert(llmstxtTable)
      .values({
        organizationId: ctx.session.user.organizationId,
        content: "", // If this is the first time  will be generated later
        contentToc: "",
        orderedContentIds,
      } as any) // Type assertion needed due to Drizzle's type system limitations
      .onConflictDoUpdate({
        target: [llmstxtTable.organizationId],
        set: {
          orderedContentIds,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        } as any, // Type assertion needed due to Drizzle's type system limitations
      });

    revalidatePath(`/llms.txt`);
    revalidatePath(`/llms-full.txt`);
  });

const updateLlmsConfigSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["TOC", "SINGLE"]),
});

export const updateLlmsConfigAction = authActionClient
  .schema(updateLlmsConfigSchema)
  .metadata({ name: "updateLlmsConfig" })
  .action(async ({ parsedInput, ctx }) => {
    const values = {
      organizationId: ctx.session.user.organizationId,
      title: parsedInput.title || null,
      description: parsedInput.description || null,
      type: parsedInput.type as "TOC" | "SINGLE",
      content: "",
      contentToc: "",
    } as const;

    const setValues = {
      title: parsedInput.title || null,
      description: parsedInput.description || null,
      type: parsedInput.type as "TOC" | "SINGLE",
      updatedAt: sql`CURRENT_TIMESTAMP`,
    } as const;

    await db
      .insert(llmstxtTable)
      .values(values)
      .onConflictDoUpdate({
        target: [llmstxtTable.organizationId],
        set: setValues as any,
      });

    revalidatePath(`/llms.txt`);
    revalidatePath(`/llms-full.txt`);
    return { success: true };
  });

export const getLlmsConfigAction = authActionClient.metadata({ name: "getLlmsConfig" }).action(async ({ ctx }) => {
  return getLlmsConfig(ctx.session.user.organizationId);
});
