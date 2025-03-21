"use client";

import { AssistantRuntimeProvider } from "@repo/design/components/chat/assistant-ui/export/assistant-ui-react";
import { useVercelUseChatRuntime } from "@repo/design/components/chat/assistant-ui/export/assistant-ui-react-sdk";
import { ChatProvider } from "@repo/design/components/chat/chat-provider";
import { createIdGenerator, generateId } from "ai";
import { useChat } from "ai/react";
import { useState } from "react";

export function UiChatRuntime({
  children,
}: Readonly<{
  children: any;
}>) {
  // A unique secret to associate the chats with the user
  let userKey;
  if (typeof window !== "undefined") {
    userKey = localStorage?.getItem(`chat-user-key`);
  }
  if (!userKey) {
    userKey = generateId();
    if (typeof window !== "undefined") {
      localStorage?.setItem(`chat-user-key`, userKey);
    }
  }
  const [chatId, setChatId] = useState(() => generateId());
  const userChatId = `${userKey}-${chatId}`;

  const chat = useChat({
    api: "/chat/ui/api",
    id: chatId,
    generateId: createIdGenerator({
      prefix: "msgc",
      size: 16,
    }),
    // Send only the last message to the server
    experimental_prepareRequestBody({ messages, id }) {
      return { message: messages[messages.length - 1], id, userChatId };
    },
  });

  const runtime = useVercelUseChatRuntime(chat);
  return (
    <ChatProvider initialData={{ chat, setChatId }}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </ChatProvider>
  );
}
