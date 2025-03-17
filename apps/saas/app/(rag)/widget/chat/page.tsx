import { Metadata } from "next";

import Image from "next/image";
import UiChat from "../../chat/ui/chat";

export const metadata: Metadata = {
  title: "Chat",
  description: "Chat with your documents.",
};

export const runtime = "nodejs";

export default async function ChatPage() {
  return (
    <div className="relative">
      <div className="flex flex-col justify-center items-center min-h-[100dvh] px-4">
        <div className="w-full">
          <UiChat modalMode={true} />
        </div>
      </div>
      <div className="absolute float-right bottom-3 right-0 text-right text-sm text-muted-foreground pr-8">
        <a href="https://ragrabbit.com" target="_blank" className="flex items-center gap-1">
          <Image src="/logo_small.svg" alt="RagRabbit" width={0} height={0} className="inline-block w-5 h-5" />
          <span className="text-accent-foreground font-bold">RagRabbit</span>
        </a>
      </div>
    </div>
  );
}
