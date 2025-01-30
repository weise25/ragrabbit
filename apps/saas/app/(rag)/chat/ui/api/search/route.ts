import db from "@repo/db";
import { and, desc, sql } from "@repo/db/drizzle";
import { llamaindexEmbedding } from "@repo/db/schema/rag";
import { NextResponse } from "next/server";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().min(1),
});

export async function POST(request: Request) {
  const organizationId = 1;
  try {
    const body = await request.json();
    let { query } = searchSchema.parse(body);

    if (query.length < 3) {
      return NextResponse.json({ results: [] });
    }
    query = query.slice(0, 50).replace(/[^a-zA-Z0-9_\s]/gi, "");
    query = query.replace(/\s+/g, "+");
    query = `"${query}":*`;

    // Create the weighted document vector for ranking
    const match = sql`(
      setweight(to_tsvector('english', ${llamaindexEmbedding.metadata} ->> 'pageUrl'), 'A') ||
      setweight(to_tsvector('english', ${llamaindexEmbedding.metadata} ->> 'pageTitle'), 'B') ||
      setweight(to_tsvector('english', ${llamaindexEmbedding.metadata} ->> 'pageDescription'), 'C') ||
      setweight(to_tsvector('english', ${llamaindexEmbedding.document}), 'D')
    )`;

    const results = await db
      .select({
        id: llamaindexEmbedding.id,
        document: llamaindexEmbedding.document,
        metadata: llamaindexEmbedding.metadata,
        /*headline:
          sql<string>`ts_headline('english', ${llamaindexEmbedding.document}, plainto_tsquery('english', ${query}))`.as(
            "headline"
          ),*/
        rank: sql<number>`ts_rank(${match}, plainto_tsquery('english', ${query}))`.as("rank"),
      })
      .from(llamaindexEmbedding)
      .where(
        and(
          sql`(${llamaindexEmbedding.metadata}->>'organizationId')::int = ${organizationId}`,
          sql`${match} @@ to_tsquery('english', ${query})`
        )
      )
      .orderBy((t) => desc(t.rank))
      .limit(5);

    // Deduplicate results by contentId, keeping the highest ranked result
    const dedupedResults = [];
    for (const result of results) {
      if (!dedupedResults.some((r) => r.metadata.contentId === result.metadata.contentId)) {
        dedupedResults.push(result);
      }
    }

    return NextResponse.json({
      results: dedupedResults.map((r) => ({
        title: r.metadata.pageTitle,
        url: r.metadata.pageUrl,
        description: r.metadata.pageDescription,
        rank: r.rank,
      })),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Failed to perform search" }, { status: 500 });
  }
}
