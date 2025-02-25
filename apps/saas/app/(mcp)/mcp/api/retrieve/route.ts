import { getRagRetriever } from "@repo/rag/answering/llamaindex";
import { MetadataMode } from "@repo/rag/llamaindex.mjs";
import { NextResponse } from "next/server";
import { z } from "zod";

// Add schema for query validation
const QuerySchema = z.object({
  query: z.string().max(500, "Query must not exceed 500 characters"),
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate the request body
    const result = QuerySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }
    const { query } = result.data;

    const retriever = await getRagRetriever();
    const relevantSources = await retriever.retrieve({
      query,
    });

    // Transform the sources to match the NodeWithScore interface expected by the MCP client
    const transformedSources = relevantSources.map((source) => ({
      metadata: {
        pageUrl: source.node.metadata.pageUrl,
        pageTitle: source.node.metadata.pageTitle,
        pageDescription: source.node.metadata.pageDescription,
        contentId: source.node.metadata.contentId,
        organizationId: source.node.metadata.organizationId,
      },
      content: source.node.getContent(MetadataMode.NONE),
      score: source.score,
    }));

    return NextResponse.json(transformedSources);
  } catch (error) {
    console.error("Error retrieving documents:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
