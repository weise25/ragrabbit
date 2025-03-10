import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@repo/db";
import { Indexed, indexedTable, IndexStatus, normalizeUrl } from "@repo/db/schema/rag";
import { indexedContentTable } from "@repo/db/schema/rag";
import { validateApiRequest } from "../../utils";
import { UserError } from "@repo/core";

export const addContentSchema = z.object({
  url: z.string().url(),
  doCrawl: z.boolean().default(false),
  content: z.string().optional(),
});

export type AddContentInput = z.infer<typeof addContentSchema>;

async function addContent(parsedInput: AddContentInput, organizationId: number) {
  const { url, doCrawl, content } = parsedInput;
  const normalizedUrl = normalizeUrl(url);

  const values = {
    source: "API",
    type: content ? "CONTENT" : "URL",
    url,
    normalizedUrl,
    doCrawl: doCrawl ?? false,
    isSitemap: false,
    depth: 0,
    skip: false,
    status: content ? IndexStatus.SCRAPED : IndexStatus.PENDING,
  };

  // Upsert the indexed entry
  const [indexed] = await db
    .insert(indexedTable)
    .values({
      organizationId,
      ...values,
    } as any)
    .onConflictDoUpdate({
      target: [indexedTable.organizationId, indexedTable.normalizedUrl],
      set: {
        ...values,
        updatedAt: new Date(),
      } as any,
    })
    .returning();

  // If content is provided, upsert the indexed content entry
  if (content) {
    await db
      .insert(indexedContentTable)
      .values({
        indexId: indexed.id,
        content,
      })
      .onConflictDoUpdate({
        target: [indexedContentTable.indexId],
        set: {
          content,
          updatedAt: new Date(),
        } as any,
      });
  }

  return indexed;
}

export async function POST(req: NextRequest) {
  try {
    const validated = await validateApiRequest(req, addContentSchema);

    const result = await addContent(validated.data, validated.organizationId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ...error.payload, error: error.message }, { status: error.status || 500 });
  }
}
