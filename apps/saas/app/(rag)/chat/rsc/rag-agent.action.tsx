"use server";

import EasyMarkdown from "@repo/design/components/chat/markdown";
import { getRagContextChat } from "@repo/rag/answering/llamaindex";
import { createStreamableUI, getMutableAIState } from "ai/rsc";
import { nanoid } from "nanoid";
import SourcesList from "../sources-list";
import type { ClientMessage, ServerMessage } from "./ai-provider";

/**
 * A direct rag agent that search for the answer in the knowledge base
 */
export async function ragAgent(message: string): Promise<ClientMessage> {
  const history = getMutableAIState();
  history.update((messages: ServerMessage[]) => [...messages, { role: "user", content: message }]);

  const ui = createStreamableUI(<div>Searching for {message}...</div>);

  async function chat() {
    const chatEngine = await getRagContextChat();
    const response = await chatEngine.chat({
      message,
      chatHistory: Array.from(history.get()),
      stream: true,
    });

    let content = "";
    for await (const { delta, sourceNodes } of response) {
      content += delta;
      ui.update(
        <div>
          <SourcesList sources={sourceNodes} />
          <EasyMarkdown>{content}</EasyMarkdown>
        </div>
      );
    }
    ui.done();

    history.done((messages: ServerMessage[]) => [...messages, { role: "assistant", content }]);
  }
  chat().catch((error) => {
    console.error(error);
  });

  return {
    id: nanoid(),
    role: "assistant",
    display: ui.value,
  };
}
