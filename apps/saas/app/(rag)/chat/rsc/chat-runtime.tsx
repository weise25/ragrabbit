"use client";

import {
  AssistantRuntimeProvider,
  type AppendMessage,
} from "@repo/design/components/chat/assistant-ui/export/assistant-ui-react";
import { useVercelRSCRuntime } from "@repo/design/components/chat/assistant-ui/export/assistant-ui-react-sdk";
import { useActions, useUIState } from "ai/rsc";
import { nanoid } from "nanoid";
import { env } from "@/env.mjs";
import type { AI } from "./ai-provider";

export default function ChatRuntime({ children }) {
  const { toolsAgent, ragAgent } = useActions();
  const [messages, setMessages] = useUIState<typeof AI>();

  const onNew = async (m: AppendMessage) => {
    if (m.content[0]?.type !== "text") throw new Error("Only text messages are supported");

    const input = m.content[0].text;
    setMessages((currentConversation) => [...currentConversation, { id: nanoid(), role: "user", display: input }]);
    let message;

    // NB: agentMode is still experimental
    const agentMode = false;
    if (agentMode) {
      message = await toolsAgent(input);
    } else {
      message = await ragAgent(input);
    }

    setMessages((currentConversation) => [...currentConversation, message]);
  };

  const runtime = useVercelRSCRuntime({ messages, onNew, convertMessage: (m) => m });

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
