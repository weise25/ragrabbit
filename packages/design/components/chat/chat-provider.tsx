"use client";

import { createContext, useContext, useState } from "react";

export interface ChatContextType {
  agentMode: boolean;
  welcomeMessage: string;
  suggestedQueries: string[];
  logoUrl: string;
  setAgentMode: (mode: boolean) => void;
  setWelcomeMessage: (message: string) => void;
  setSuggestedQueries: (queries: string[]) => void;
  setLogoUrl: (url: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}

interface ChatProviderProps {
  children: React.ReactNode;
  initialData?: Partial<ChatContextType>;
}

function ChatProvider({ children, initialData = {} }: ChatProviderProps) {
  const [agentMode, setAgentMode] = useState(initialData.agentMode ?? false);
  const [welcomeMessage, setWelcomeMessage] = useState(initialData.welcomeMessage ?? "");
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>(initialData.suggestedQueries ?? []);
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl ?? "");

  const value = {
    agentMode,
    welcomeMessage,
    suggestedQueries,
    logoUrl,
    setAgentMode,
    setWelcomeMessage,
    setSuggestedQueries,
    setLogoUrl,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export { ChatProvider, useChat };
