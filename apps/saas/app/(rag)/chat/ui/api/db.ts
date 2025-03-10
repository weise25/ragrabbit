import { RateLimitError } from "@repo/core";
import db from "@repo/db";
import { and, eq, gte, sql } from "@repo/db/drizzle";
import { Chat, chatsTable, NewMessage as DbNewMessage, messagesTable, widgetConfigTable } from "@repo/db/schema";
import { logger } from "@repo/logger";
import { countTokens } from "@repo/rag/indexing/tokens";
import { LanguageModelUsage, Message, TextPart } from "ai";

const log = logger.child({
  module: "chat",
});

export async function loadMessages(chatId: string, userId: string): Promise<Message[]> {
  const chat = await db.query.chatsTable.findFirst({
    where: and(eq(chatsTable.chatId, chatId), eq(chatsTable.userId, userId)),
    with: {
      messages: true,
    },
  });

  return chat?.[0]?.messages || [];
}

export async function saveMessages(
  chatId: string,
  userId: string,
  ip: string,
  organizationId: number,
  clientMessage: Message,
  assistantMessage: Message,
  responseMessages: ResponseMessage[],
  annotations: Record<string, any>,
  usage?: LanguageModelUsage
) {
  log.debug(
    {
      chatId,
      userId,
      clientMessage: !!clientMessage,
      assistantMessage: !!assistantMessage,
      responses: responseMessages?.length,
    },
    "Saving chat"
  );
  try {
    await _saveMessages(
      chatId,
      userId,
      ip,
      organizationId,
      clientMessage,
      assistantMessage,
      responseMessages,
      annotations,
      usage
    );
  } catch (error) {
    console.error(error);
    // Ignore errors
  }
}

export type ResponseMessage = Message & {
  content: TextPart[];
};

async function _saveMessages(
  chatId: string,
  userId: string,
  ip: string,
  organizationId: number,
  clientMessage: Message | null,
  assistantMessage: Message | null,
  responseMessages: ResponseMessage[] | null,
  annotations: Record<string, any>,
  usage?: LanguageModelUsage
) {
  const newChat = {
    chatId,
    userId,
    title: clientMessage?.content?.slice(0, 100),
    organizationId,
    ip,
    updatedAt: new Date(),
  };
  const chat = await db
    .insert(chatsTable)
    .values(newChat)
    .onConflictDoUpdate({
      set: {
        ip,
        updatedAt: new Date(),
      } as Partial<Chat>,
      target: [chatsTable.userId, chatsTable.chatId],
    })
    .returning();

  if (clientMessage) {
    const newClientMessage: Partial<Message> & DbNewMessage & { tokenCount: number } = {
      chatId: chat[0].id,
      role: clientMessage.role,
      content: clientMessage.content,
      data: clientMessage.data,
      tokenCount: await countTokens(clientMessage.content),
    };
    await db.insert(messagesTable).values(newClientMessage);
  }

  if (assistantMessage) {
    const newAssistantMessage: Partial<Message> & DbNewMessage & { tokenCount: number } = {
      chatId: chat[0].id,
      role: "system", // OpenAI API supports multiple system messages, but others don't.
      content: assistantMessage.content,
      data: assistantMessage.data,
      tokenCount: await countTokens(assistantMessage.content),
    };
    await db.insert(messagesTable).values(newAssistantMessage);
  }

  if (responseMessages) {
    const newResponseMessages: (Partial<Message> & DbNewMessage)[] = await Promise.all(
      responseMessages.map(async (message) => ({
        chatId: chat[0].id,
        role: message.role,
        content: message?.content?.[0]?.text,
        data: message.data,
        annotations: annotations as any,
        tokenCount: await countTokens(message?.content?.[0]?.text),
        costInputTokens: usage?.promptTokens,
        costOutputTokens: usage?.completionTokens,
      }))
    );
    await db.insert(messagesTable).values(newResponseMessages);

    // Also increment the totals and the period is automatically reset if it's over the current month
    await updateUsageCount(usage, organizationId);
  }
}

async function updateUsageCount(usage: LanguageModelUsage, organizationId: number) {
  await db
    .update(widgetConfigTable)
    .set({
      [widgetConfigTable.currentPeriodInputTokens.name]: sql`
          CASE 
            WHEN date_trunc('month', ${widgetConfigTable.currentPeriodStart}) < date_trunc('month', now()) 
            THEN ${usage.promptTokens}
            ELSE ${widgetConfigTable.currentPeriodInputTokens} + ${usage.promptTokens}
          END
        `,
      [widgetConfigTable.currentPeriodOutputTokens.name]: sql`
          CASE 
            WHEN date_trunc('month', ${widgetConfigTable.currentPeriodStart}) < date_trunc('month', now()) 
            THEN ${usage.completionTokens}
            ELSE ${widgetConfigTable.currentPeriodOutputTokens} + ${usage.completionTokens}
          END
        `,
      [widgetConfigTable.currentPeriodStart.name]: sql`
          CASE 
            WHEN date_trunc('month', ${widgetConfigTable.currentPeriodStart}) < date_trunc('month', now()) 
            THEN date_trunc('month', now())
            ELSE ${widgetConfigTable.currentPeriodStart}
          END
        `,
    })
    .where(eq(widgetConfigTable.organizationId, organizationId))
    .returning();
}

export async function checkLimitsUsage(organizationId: number): Promise<boolean> {
  const widgetConfig = await db.query.widgetConfigTable.findFirst({
    where: eq(widgetConfigTable.organizationId, organizationId),
  });

  const maxTokens = widgetConfig?.maxTokens * 1_000_000;
  const inputOutputCostRatio = 4;
  const currentTokens =
    widgetConfig?.currentPeriodInputTokens / inputOutputCostRatio + widgetConfig?.currentPeriodOutputTokens;
  if (currentTokens > maxTokens) {
    throw new RateLimitError("Usage quota exceeded");
  }

  return true;
}

export async function checkLimitsIp(organizationId: number, ip: string): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  // Check max number of chats from the same IP in the last hour:
  const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60);
  const maxChats = Number(process.env.MAX_CHATS_PER_IP || 10);
  const chats = await db.query.chatsTable.findMany({
    where: and(
      eq(chatsTable.organizationId, organizationId),
      eq(chatsTable.ip, ip),
      gte(chatsTable.createdAt, oneHourAgo)
    ),
  });
  if (chats.length >= maxChats) {
    throw new RateLimitError("Too many requests");
  }

  return true;
}
