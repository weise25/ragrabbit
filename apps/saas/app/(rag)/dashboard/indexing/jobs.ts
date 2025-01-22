import { tasks } from "@repo/jobs";
import db from "@repo/db";
import { indexedTable } from "@repo/db/schema";
import type {
  ragGenerateEmbeddingsTask,
  ragGetContentTask,
  ragIndexAllTask,
  ragProcessingTask,
} from "@repo/jobs/tasks/rag/indexing";
import { env } from "@repo/jobs/env.mjs";
import { and, eq, inArray } from "@repo/db/drizzle";
import { setTimeout } from "timers/promises";

interface JobsInterface {
  triggerProcessing(indexIds: number[], orgId: number): Promise<void>;
  triggerEmbeddings(indexIds: number[], orgId: number): Promise<void>;
  triggerGetContent(indexIds: number[], orgId: number): Promise<void>;
  triggerIndexAll(orgId: number): Promise<void>;
}

class PgJobs implements JobsInterface {
  async triggerProcessing(indexIds: number[], orgId: number) {
    await db
      .update(indexedTable)
      .set({ status: "PENDING" })
      .where(and(inArray(indexedTable.id, indexIds), eq(indexedTable.organizationId, orgId)));
  }

  async triggerEmbeddings(indexIds: number[], orgId: number) {
    this.triggerProcessing(indexIds, orgId);
  }

  async triggerGetContent(indexIds: number[], orgId: number) {
    this.triggerProcessing(indexIds, orgId);
  }

  async triggerIndexAll(orgId: number) {
    await db.update(indexedTable).set({ status: "PENDING" }).where(eq(indexedTable.organizationId, orgId));
  }
}

class TriggerDevJobs implements JobsInterface {
  async triggerProcessing(indexIds: number[], orgId: number) {
    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < indexIds.length; i += batchSize) {
      const batchIds = indexIds.slice(i, i + batchSize);
      await tasks.batchTrigger<typeof ragProcessingTask>(
        "rag-processing",
        indexIds.map((id) => ({
          payload: { indexedId: id },
          options: { tags: ["org:" + orgId] },
        }))
      );
      await setTimeout(1000);
    }
  }

  async triggerEmbeddings(indexIds: number[], orgId: number) {
    await tasks.batchTrigger<typeof ragGenerateEmbeddingsTask>(
      "rag-generate-embeddings",
      indexIds.map((id) => ({
        payload: { indexedId: id },
        options: { tags: ["org:" + orgId] },
      }))
    );
  }

  async triggerGetContent(indexIds: number[], orgId: number) {
    await tasks.batchTrigger<typeof ragGetContentTask>(
      "rag-get-content",
      indexIds.map((id) => ({
        payload: { indexedId: id },
        options: { tags: ["org:" + orgId] },
      }))
    );
  }

  async triggerIndexAll(orgId: number) {
    await tasks.trigger<typeof ragIndexAllTask>("rag-index-all", { orgId }, { tags: ["org:" + orgId] });
  }
}

export const jobs: JobsInterface = env.TRIGGER_SECRET_KEY ? new TriggerDevJobs() : new PgJobs();
