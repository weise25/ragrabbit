"use server";

import { createAI } from "ai/rsc";
import { ReactNode } from "react";
import { ragAgent } from "./rag-agent.action";
import { toolsAgent } from "./tools-agent.action";

export interface ServerMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClientMessage {
  id: string;
  role: "user" | "assistant";
  display: ReactNode;
}

export const AI = createAI<ServerMessage[], ClientMessage[]>({
  actions: {
    toolsAgent,
    ragAgent,
  },
  initialAIState: [],
  initialUIState: [],
});
