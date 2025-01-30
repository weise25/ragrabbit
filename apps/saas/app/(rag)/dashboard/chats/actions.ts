"use server";
import { authActionClient } from "@repo/actions";
import db from "@repo/db";
import { chatsTable, messagesTable } from "@repo/db/schema";
import { and, asc, count, desc, eq, inArray, not, sql } from "@repo/db/drizzle";
import { z } from "zod";
import { getAllChatsSchema } from "./actions.schema";

export interface GetAllChatsResult {
  chats: { id: string; userId: string; title: string; messageCount: number; totalTokens: number }[];
  totalCount: number;
}

export const getAllChats = authActionClient
  .schema(getAllChatsSchema)
  .metadata({ name: "getAllChats" })
  .action<GetAllChatsResult>(async ({ parsedInput, ctx }) => {
    const page = parsedInput.page;
    const pageSize = parsedInput.pageSize;
    const offset = (page - 1) * pageSize;

    // get total count
    const totalCountResultPromise = db
      .select({
        count: count(chatsTable.id),
      })
      .from(chatsTable)
      .where(eq(chatsTable.organizationId, ctx?.session?.user?.organizationId || 1));

    // Get paginate chats:
    const chatsPromise = db
      .select({
        id: chatsTable.id,
        userId: chatsTable.userId,
        title: chatsTable.title,
        messageCount: count(sql<number>`CASE WHEN ${messagesTable.role} != 'system' THEN 1 END`),
        totalTokens: sql<number>`sum(${messagesTable.tokenCount})`,
      })
      .from(chatsTable)
      .where(eq(chatsTable.organizationId, ctx?.session?.user?.organizationId || 1))
      .leftJoin(messagesTable, eq(chatsTable.id, messagesTable.chatId))
      .groupBy(chatsTable.id)
      .orderBy(desc(chatsTable.updatedAt))
      .limit(pageSize)
      .offset(offset);

    const [totalCountResult, chats] = await Promise.all([totalCountResultPromise, chatsPromise]);
    const totalCount = Number(totalCountResult[0].count);

    return {
      chats,
      totalCount,
    };
  });
