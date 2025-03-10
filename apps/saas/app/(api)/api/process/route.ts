import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@repo/db";
import { Indexed, indexedTable, IndexStatus, normalizeUrl } from "@repo/db/schema/rag";
import { indexedContentTable } from "@repo/db/schema/rag";
import { validateApiRequest } from "../../utils";
import { addContentSchema } from "../content/route";
import { jobs } from "@/app/(rag)/dashboard/indexing/jobs";
import { and, eq, inArray, isNull } from "@repo/db/drizzle";
import { UnauthorizedError, UserError } from "@repo/core";

export const indexSchema = z.object({
  url: z.string().url().optional(),
});

export type AddContentInput = z.infer<typeof addContentSchema>;

async function runProcessing(parsedInput: AddContentInput, organizationId: number) {
  const { url } = parsedInput;
  let normalizedUrl;
  let ids: number[] = [];

  // Mark for processing a single url or origin:
  if (url) {
    normalizedUrl = normalizeUrl(url);
    const indexed = await db
      .select({ id: indexedTable.id })
      .from(indexedTable)
      .where(and(eq(indexedTable.organizationId, organizationId), eq(indexedTable.normalizedUrl, normalizedUrl)));
    const id = indexed[0]?.id;
    if (!id) {
      throw new UserError("Index not found");
    }
    ids = [id];
  } else {
    // Mark for processing all with origin and single index:
    const indexed = await db
      .select({ id: indexedTable.id })
      .from(indexedTable)
      .where(and(eq(indexedTable.organizationId, organizationId), isNull(indexedTable.foundFromIndexId)));
    ids = indexed.map((i) => i.id);
  }
  await jobs.triggerProcessing(ids, organizationId);
  return { success: true, processingIds: ids };
}

export async function POST(req: NextRequest) {
  try {
    const validated = await validateApiRequest(req, addContentSchema);

    const result = await runProcessing(validated.data, validated.organizationId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ...error.payload, error: error.message }, { status: error.status || 500 });
  }
}
