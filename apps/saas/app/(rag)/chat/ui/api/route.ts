import { openai } from "@ai-sdk/openai";
import { Source } from "@repo/design/components/chat/source-box";
import { getPrompt, getRagRetriever } from "@repo/rag/answering/llamaindex";
import { MetadataMode } from "@repo/rag/llamaindex.mjs";
import {
  appendClientMessage,
  createDataStreamResponse,
  createIdGenerator,
  Message,
  smoothStream,
  streamText,
} from "ai";

export const maxDuration = 30;

function loadChat(id: string) {
  return {
    messages: [],
  };
}

function saveChat(id: string, clientMessage: Message, responseMessages: Message[], sources: any) {
  return {
    id,
    clientMessage,
    responseMessages,
    sources,
  };
}

export async function POST(req: Request, res: Response) {
  // get the last message from the client:
  const { message, id }: { message: Message; id: string } = await req.json();

  // load the previous messages from the server:
  const loadedChat = await loadChat(id);
  let messages = loadedChat.messages;

  // TODO: questo è il modo immediato, ma non riesco a passare i dati
  // TODO: fare tool call così fa pure query rewrite
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
        sources.push({
          url: source.node.metadata.pageUrl,
          title: source.node.metadata.pageTitle,
          abstract: source.node.metadata.pageDescription?.slice(0, 100),
          score: Number(source.score.toFixed(2)),
        } as Source);

        let text = "--- \n";
        text += "Source: " + source.node.metadata.title + "\n";
        text += "URL: " + source.node.metadata.url + "\n";
        text += source.node.getContent(MetadataMode.NONE) + "\n";
        content.push(text);
        const question = source.node.metadata.questions?.[0];
        suggestedPrompts.add(question);
      }
      console.log("### RAG sources", sources);
      dataStream.writeMessageAnnotation({
        type: "sources",
        data: sources,
      });

      // Add context to the messages:
      messages = [
        ...messages,
        {
          role: "assistant",
          content: "Use the following information to answer the question: " + content.slice(0, 3).join("\n"),
        },
      ];

      // append the new message:
      messages = appendClientMessage({
        messages,
        message,
      });

      const result = streamText({
        model: openai("gpt-4o-mini"),
        system: getPrompt(),
        experimental_transform: smoothStream(),
        messages,
        // id format for server-side messages:
        experimental_generateMessageId: createIdGenerator({
          prefix: "msgs",
          size: 16,
        }),
        async onFinish({ response }) {
          dataStream.writeMessageAnnotation({
            type: "suggested-prompts",
            data: Array.from(suggestedPrompts).reverse().slice(0, 3),
          });
          await saveChat(id, message, response.messages as Message[], sources);
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
