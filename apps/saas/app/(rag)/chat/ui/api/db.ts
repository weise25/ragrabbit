import { openai } from "@ai-sdk/openai";
import db from "@repo/db";
import { and, eq } from "@repo/db/drizzle";
import {
  Chat,
  chatsTable,
  messagesTable,
  NewChat,
  Message as DbMessage,
  NewMessage as DbNewMessage,
} from "@repo/db/schema";
import { Source } from "@repo/design/components/chat/source-box";
import { logger } from "@repo/logger";
import { getPrompt, getRagRetriever } from "@repo/rag/answering/llamaindex";
import { countTokens } from "@repo/rag/indexing/tokens";
import { MetadataMode } from "@repo/rag/llamaindex.mjs";
import {
  appendClientMessage,
  createDataStreamResponse,
  createIdGenerator,
  generateId,
  Message,
  smoothStream,
  streamText,
  TextPart,
} from "ai";

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
  annotations: Record<string, any>
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
      annotations
    );
  } catch (error) {
    console.error(error);
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
  annotations: Record<string, any>
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
      }))
    );
    await db.insert(messagesTable).values(newResponseMessages);
  }
}
