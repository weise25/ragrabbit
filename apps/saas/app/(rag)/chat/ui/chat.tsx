import Chat from "@repo/design/components/chat/chat";
import { UiChatRuntime } from "./chat-runtime";
import { getWidgetConfig } from "../../dashboard/widget/actions";
import { ChatConfigProvider, ChatContextType } from "@repo/design/components/chat/chat-config-provider";

export default async function UiChat({ modalMode }: { modalMode?: boolean }) {
  const { data: widgetConfig } = await getWidgetConfig({});

  let initialData: Partial<ChatContextType> = {
    modalMode: modalMode ?? false,
  };
  if (widgetConfig) {
    initialData = {
      ...initialData,
      agentMode: false,
      welcomeMessage: widgetConfig.welcomeMessage,
      suggestedQueries: widgetConfig.suggestedQueries,
      logoUrl: widgetConfig.logoUrl,
    };
  }
  return (
    <ChatConfigProvider initialData={initialData}>
      <UiChatRuntime>
        <Chat />
      </UiChatRuntime>
    </ChatConfigProvider>
  );
}
