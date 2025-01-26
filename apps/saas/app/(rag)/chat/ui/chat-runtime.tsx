"use client";

import { AssistantRuntimeProvider } from "@repo/design/components/chat/assistant-ui/export/assistant-ui-react";
import { useVercelUseChatRuntime } from "@repo/design/components/chat/assistant-ui/export/assistant-ui-react-sdk";
import { ChatProvider } from "@repo/design/components/chat/chat-provider";
import { createIdGenerator } from "ai";
import { useChat } from "ai/react";

export function UiChatRuntime({
  children,
}: Readonly<{
  children: any;
}>) {
  const chat = useChat({
    api: "/chat/ui/api",
    generateId: createIdGenerator({
      prefix: "msgc",
      size: 16,
    }),
    // Send only the last message to the server
    experimental_prepareRequestBody({ messages, id }) {
      return { message: messages[messages.length - 1], id };
    },
  });

  const runtime = useVercelUseChatRuntime(chat);
  return (
    <ChatProvider initialData={{ chat }}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </ChatProvider>
  );
}
