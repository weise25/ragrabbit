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
import { Metadata, MetadataMode } from "@repo/rag/llamaindex.mjs";
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
import { loadMessages, ResponseMessage, saveMessages } from "./db";

export const maxDuration = 30;

export async function POST(req: Request, res: Response) {
  // get the last message from the client:
  const { message, id, userChatId }: { message: Message; id: string; userChatId: string } = await req.json();
  message.content = message.content.slice(0, 1000); // limit the message to 1000 characters

  const [userId, chatId] = userChatId.split("-");
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip");

  // load the previous messages from the server:
  let messages = await loadMessages(userId, chatId);

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const retriever = await getRagRetriever();
      const relevantSources = await retriever.retrieve({
        query: message.content,
      });

      let content = [];
      let sources = [];
      let suggestedPrompts = new Set<string>();
      for (const source of relevantSources) {
        const metadata: Metadata = source.node.metadata;
        sources.push({
          url: metadata.pageUrl,
          title: metadata.pageTitle,
          abstract: metadata.pageDescription?.slice(0, 100),
          score: Number(source.score.toFixed(2)),
        } as Source);

        let text = "--- \n";
        text += "Source: " + metadata.pageTitle + "\n";
        text += "URL: " + metadata.pageUrl + "\n";
        text += source.node.getContent(MetadataMode.NONE) + "\n";
        content.push(text);

        // Pick the first question:
        const question = source.node.metadata.questions?.[0];
        suggestedPrompts.add(question);
      }

      // Send to UI as a message annotation:
      const sourcesAnnotation = {
        type: "sources",
        data: sources,
      };
      // TODO: this is cleaner in the frontend, but will be sent only when the first chunk is answered by AI:
      dataStream.writeMessageAnnotation(sourcesAnnotation);

      // Add context to the messages:
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "Use the following information to answer the question: " + content.slice(0, 3).join("\n"),
      };
      messages = [...messages, assistantMessage];

      // append the new message:
      messages = appendClientMessage({
        messages,
        message,
      });
      const savePromise = saveMessages(chatId, userId, ip, 1, message, assistantMessage, null, {
        sources: sourcesAnnotation,
      });

      const result = streamText({
        model: openai("gpt-4o-mini"),
        system: getPrompt(),
        //experimental_transform: smoothStream(),
        messages,
        // id format for server-side messages:
        experimental_generateMessageId: createIdGenerator({
          prefix: "msgs",
          size: 16,
        }),
        async onFinish({ response }) {
          // Send the questions extracted previously:
          const suggestedPromptsAnnotation = {
            type: "suggested-prompts",
            data: Array.from(suggestedPrompts).reverse().slice(0, 3),
          };
          dataStream.writeMessageAnnotation(suggestedPromptsAnnotation);

          // Save the chat:
          await savePromise;
          await saveMessages(chatId, userId, ip, 1, null, null, response.messages as ResponseMessage[], {
            sources: sourcesAnnotation,
            suggestedPrompts: suggestedPromptsAnnotation,
          });
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
