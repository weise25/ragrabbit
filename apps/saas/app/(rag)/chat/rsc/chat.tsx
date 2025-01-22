import Chat from "@repo/design/components/chat/chat";
import { AI } from "./ai-provider";
import ChatRuntime from "./chat-runtime";
import { ChatProvider } from "@repo/design/components/chat/chat-provider";
import { getWidgetConfig } from "@/app/(rag)/dashboard/widget/actions";

export default async function RscChat() {
  const { data: widgetConfig } = await getWidgetConfig({});

  let initialData = {};
  if (widgetConfig) {
    initialData = {
      agentMode: false,
      welcomeMessage: widgetConfig.welcomeMessage,
      suggestedQueries: widgetConfig.suggestedQueries,
      logoUrl: widgetConfig.logoUrl,
    };
  }
  return (
    <AI>
      <ChatRuntime>
        <ChatProvider initialData={initialData}>
          <Chat />
        </ChatProvider>
      </ChatRuntime>
    </AI>
  );
}
