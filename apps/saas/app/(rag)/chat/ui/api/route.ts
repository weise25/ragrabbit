import { openai } from "@ai-sdk/openai";
import { UserError } from "@repo/core";
import { Source } from "@repo/design/components/chat/source-box";
import { getPrompt, getRagRetriever } from "@repo/rag/answering/llamaindex";
import { Metadata, MetadataMode } from "@repo/rag/llamaindex.mjs";
import { appendClientMessage, createDataStreamResponse, createIdGenerator, generateId, Message, streamText } from "ai";
import { checkLimitsIp, checkLimitsUsage, loadMessages, ResponseMessage, saveMessages } from "./db";

export const maxDuration = 30;

const SOURCES_RAG = 3;

export async function POST(req: Request, res: Response) {
  const orgId = 1;
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip");

  // Check limits and in parallel but abort the LLM request as soon as any fails:
  const abortController = new AbortController();
  try {
    const ipPromise = checkLimitsIp(orgId, ip);
    const usagePromise = checkLimitsUsage(orgId);
    const handleRequestPromise = handleRequest(ip, orgId, req, res, abortController.signal);

    return await Promise.all([ipPromise, usagePromise, handleRequestPromise])
      .catch((error) => {
        // If any fails, abort the LLM request:
        abortController.abort();
        throw error;
      })
      .then((response) => {
        return response[2];
      });
  } catch (e) {
    if (e instanceof UserError) {
      return new Response(e.message, { status: e.status });
    }
    return new Response("Internal server error", { status: 500 });
  }
}

function handleAbort(signal: AbortSignal) {
  if (signal?.aborted) {
    throw new Error("Operation was aborted");
  }
}

async function handleRequest(ip: string, orgId: number, req: Request, res: Response, signal?: AbortSignal) {
  // get the last message from the client:
  const { message, id, userChatId }: { message: Message; id: string; userChatId: string } = await req.json();
  message.content = message.content.slice(0, 1000); // limit the message to 1000 characters

  const [userId, chatId] = userChatId.split("-");

  // load the previous messages in parallel:
  handleAbort(signal);
  let messagesPromise = loadMessages(userId, chatId);

  return createDataStreamResponse({
    execute: async (dataStream) => {
      handleAbort(signal);
      const retriever = await getRagRetriever();
      const relevantSources = await retriever.retrieve({
        query: message.content,
      });

      let content = [];
      let sources = [];
      let suggestedPrompts = new Set<string>();
      for (const source of relevantSources) {
        const metadata: Metadata = source.node.metadata;
        // Skip duplicates:
        if (sources.find((s) => s.url === metadata.pageUrl)) {
          continue;
        }
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
      handleAbort(signal);
      const sourcesAnnotation = {
        type: "sources",
        data: sources,
      };
      // Send the annotation immediately by writing an empty text part first
      dataStream.writeMessageAnnotation(sourcesAnnotation);

      // Add context to the messages:
      handleAbort(signal);
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "Use the following information to answer the question: \n" + content.slice(0, SOURCES_RAG).join("\n"),
      };
      let messages = await messagesPromise;
      messages = [...messages, assistantMessage];

      // append the new message:
      messages = appendClientMessage({
        messages,
        message,
      });
      const savePromise = saveMessages(
        chatId,
        userId,
        ip,
        orgId,
        message,
        assistantMessage,
        null,
        {
          sources: sourcesAnnotation,
        },
        null
      );

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
        abortSignal: signal,

        async onFinish({ response, usage }) {
          // Send the questions extracted previously:
          const suggestedPromptsAnnotation = {
            type: "suggested-prompts",
            data: Array.from(suggestedPrompts).reverse().slice(0, 3),
          };
          dataStream.writeMessageAnnotation(suggestedPromptsAnnotation);

          // Save the chat:
          await savePromise;
          await saveMessages(
            chatId,
            userId,
            ip,
            orgId,
            null,
            null,
            response.messages as ResponseMessage[],
            {
              sources: sourcesAnnotation,
              suggestedPrompts: suggestedPromptsAnnotation,
            },
            usage
          );
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
