"use server";

import { openai } from "@ai-sdk/openai";
import EasyMarkdown from "@repo/design/components/chat/markdown";
import { getRagContextChat } from "@repo/rag/answering/llamaindex";
import { getMutableAIState, streamUI } from "ai/rsc";
import { nanoid } from "nanoid";
import { z } from "zod";
import SourcesList from "../sources-list";
import type { ClientMessage, ServerMessage } from "./ai-provider";

const systemPrompt =
  "You are a helpful assistant that can help the user with their queries, " +
  "answer in the language of the user and in Markdown format: bold, link, tables, etc. \n" +
  "When searching the knowledge base, rewrite the query to be more suitable for vector search.";

/**
 * A tools agent that can rewrite queries to be more suitable for the knowledge base
 */
export async function toolsAgent(input: string): Promise<ClientMessage> {
  // TODO: handle summary of context window:
  const history = getMutableAIState();
  history.update((messages: ServerMessage[]) => [...messages, { role: "user", content: input }]);

  const result = await streamUI({
    model: openai("gpt-4o-mini"),
    messages: [...history.get()],
    system: systemPrompt,

    text: ({ content, done }) => {
      if (done) {
        history.done((messages: ServerMessage[]) => [...messages, { role: "assistant", content }]);
      }

      return <EasyMarkdown>{content}</EasyMarkdown>;
    },
    tools: {
      rag: {
        description: "Search the knowledge base",
        parameters: z.object({
          query: z.string().describe("The query to search for"),
          language: z.string().describe("The language of the user in which the answer should be given"),
        }),
        generate: async function* ({ query, language }) {
          yield <div>Searching for {query}...</div>;

          const chatEngine = await getRagContextChat(language);
          const response = await chatEngine.chat({
            message: query,
            chatHistory: Array.from(history.get()),
            stream: true,
          });
          let content = "";
          let sources = [];
          for await (const { delta, sourceNodes } of response) {
            content += delta;
            sources = sourceNodes;
            yield (
              <>
                <SourcesList sources={sources} />
                <EasyMarkdown>{content}</EasyMarkdown>
              </>
            );
          }
          history.done((messages: ServerMessage[]) => [...messages, { role: "assistant", content }]);
          return (
            <>
              <SourcesList sources={sources} />
              <EasyMarkdown>{content}</EasyMarkdown>
            </>
          );
        },
      },
      // An example tool:
      deploy: {
        description: "Deploy repository to vercel",
        parameters: z.object({
          repositoryName: z.string().describe("The name of the repository, example: vercel/ai-chatbot"),
        }),
        generate: async function* ({ repositoryName }) {
          yield <div>Cloning repository {repositoryName}...</div>;
          await new Promise((resolve) => setTimeout(resolve, 3000));
          yield <div>Building repository {repositoryName}...</div>;
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return <div>{repositoryName} deployed!</div>;
        },
      },
    },
  });

  return {
    id: nanoid(),
    role: "assistant",
    display: result.value,
  };
}
