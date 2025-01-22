"use client";

import { useChat } from "ai/react";
import { AssistantRuntimeProvider } from "@repo/design/components/chat/assistant-ui/export/assistant-ui-react";
import { useVercelUseChatRuntime } from "@repo/design/components/chat/assistant-ui/export/assistant-ui-react-sdk";

export function UiChatRuntime({
  children,
}: Readonly<{
  children: any;
}>) {
  const chat = useChat({
    api: "/chat/ui/api",
  });

  const runtime = useVercelUseChatRuntime(chat);

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
