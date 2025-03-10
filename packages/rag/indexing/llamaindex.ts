import { PGVectorStore } from "@llamaindex/postgres";
import db, { pool } from "@repo/db";
import { eq } from "@repo/db/drizzle";
import { EmbeddingDimensions, llamaindexEmbedding } from "@repo/db/schema";
import { logger } from "@repo/logger";
import {
  Document,
  IngestionPipeline,
  SentenceSplitter,
  Settings,
  TransformComponent,
  BaseNode,
  Metadata,
  TextNode,
  NodeParser,
} from "llamaindex";
import { env } from "../env.mjs";
import { EmbeddingModel } from "../settings";
import { extractMetadata } from "./metadata.extract";
import { RagMetadata } from "@repo/db/schema";

class SummaryExtractor implements NodeParser {
  async parse(documents: Document[]): Promise<TextNode[]> {
    const llm = Settings.llm;
    const results: TextNode[] = [];

    for (const doc of documents) {
      try {
        const summary = await llm.complete({
          prompt: `Please provide a concise summary of the following text. Focus on the key points and main ideas:\n\n${doc.text}\n\nSummary:`,
        });

        // Create a new node with the original content and add summary to metadata
        const node = new TextNode({
          text: doc.text,
          metadata: {
            ...doc.metadata,
            summary: summary.text,
          },
        });

        results.push(node);
      } catch (error) {
        logger.error("Error generating summary", { error, documentId: doc.id_ });
        // If summary generation fails, create a node without summary
        const node = new TextNode({
          text: doc.text,
          metadata: doc.metadata,
        });
        results.push(node);
      }
    }

    return results;
  }
}

export async function generateEmbeddings(
  content: string,
  data: {
    id: string;
    url: string;
    title: string;
    description: string;
    organizationId: number;
    metadata: Partial<RagMetadata>;
  }
) {
  try {
    logger.info("Generating embeddings", { contentId: data.id });
    const vectorStore = await getVectorStore();
    const llm = Settings.llm;
    const pipeline = new IngestionPipeline({
      vectorStore: vectorStore,
      transformations: [
        new SummaryExtractor(),
        new SentenceSplitter({ chunkSize: Settings.chunkSize }),
        vectorStore.embedModel,
      ],
    });

    let documentMetadata = data.metadata;
    if (!documentMetadata) {
      documentMetadata = await extractMetadata(content, data.url);
    }

    const doc = new Document({
      text: content,
      metadata: {
        contentId: data.id,
        organizationId: data.organizationId,
        pageUrl: data.url,
        ...documentMetadata,
      } satisfies RagMetadata,
    });

    // Delete any existing embeddings for this index:
    await db.delete(llamaindexEmbedding).where(eq(llamaindexEmbedding.contentId, parseInt(data.id)));

    const nodes = await pipeline.run({ documents: [doc] });
    logger.info({ nodes: nodes.length }, "Generated embeddings");

    return nodes.map((node) => node.id_);
  } catch (e) {
    console.error("Error generating embeddings", e);
    throw e;
  }
}

export async function getVectorStore() {
  return new PGVectorStore({
    client: pool,
    tableName: "indexed_content_embeddings",
    performSetup: false, // We do it in DrizzleORM that better supports Vercel Postgres
    embeddingModel: Settings.embedModel,
    embedModel: Settings.embedModel,
    dimensions: EmbeddingDimensions[EmbeddingModel[env.EMBEDDING_MODEL]],
  });
}
