import Chat from "@repo/design/components/chat/chat";
import { UiChatRuntime } from "./chat-runtime";

export default function UiChat() {
  return (
    <UiChatRuntime>
      <Chat />
    </UiChatRuntime>
  );
}
