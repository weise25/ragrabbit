"use server";
import { authActionClient } from "@repo/actions";
import db from "@repo/db";
import { apiKeysTable } from "@repo/db/schema";
import { and, count, desc, eq } from "@repo/db/drizzle";
import { getAllApiKeysSchema, createApiKeySchema, deleteApiKeySchema } from "./actions.schema";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

export interface GetAllApiKeysResult {
  apiKeys: {
    id: number;
    name: string;
    createdAt: Date;
  }[];
  totalCount: number;
}

export const getAllApiKeys = authActionClient
  .schema(getAllApiKeysSchema)
  .metadata({ name: "getAllApiKeys" })
  .action<GetAllApiKeysResult>(async ({ parsedInput, ctx }) => {
    const page = parsedInput.page;
    const pageSize = parsedInput.pageSize;
    const offset = (page - 1) * pageSize;

    // get total count
    const totalCountResultPromise = db
      .select({
        count: count(apiKeysTable.id),
      })
      .from(apiKeysTable)
      .where(eq(apiKeysTable.organizationId, ctx?.session?.user?.organizationId || 1));

    // Get paginated api keys
    const apiKeysPromise = db
      .select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        createdAt: apiKeysTable.createdAt,
      })
      .from(apiKeysTable)
      .where(eq(apiKeysTable.organizationId, ctx?.session?.user?.organizationId || 1))
      .orderBy(desc(apiKeysTable.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [totalCountResult, apiKeys] = await Promise.all([totalCountResultPromise, apiKeysPromise]);
    const totalCount = Number(totalCountResult[0].count);

    return {
      apiKeys,
      totalCount,
    };
  });

export interface CreateApiKeyResult {
  success: boolean;
  apiKey?: {
    id: number;
    name: string;
    key: string;
    createdAt: Date;
  };
  error?: string;
}

export const createApiKey = authActionClient
  .schema(createApiKeySchema)
  .metadata({ name: "createApiKey" })
  .action<CreateApiKeyResult>(async ({ parsedInput, ctx }) => {
    try {
      // Generate a random API key
      const key = `rr_${randomBytes(32).toString("hex")}`;

      const [apiKey] = await db
        .insert(apiKeysTable)
        .values({
          name: parsedInput.name,
          key,
          organizationId: ctx?.session?.user?.organizationId || 1,
        })
        .returning();

      revalidatePath("/dashboard/api");
      return {
        success: true,
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          key: apiKey.key,
          createdAt: apiKey.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to create API key",
      };
    }
  });

export interface DeleteApiKeyResult {
  success: boolean;
  error?: string;
}

export const deleteApiKey = authActionClient
  .schema(deleteApiKeySchema)
  .metadata({ name: "deleteApiKey" })
  .action<DeleteApiKeyResult>(async ({ parsedInput, ctx }) => {
    try {
      await db
        .delete(apiKeysTable)
        .where(
          and(eq(apiKeysTable.id, parsedInput.id), eq(apiKeysTable.organizationId, ctx?.session?.user?.organizationId))
        );

      revalidatePath("/dashboard/api");
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to delete API key",
      };
    }
  });
