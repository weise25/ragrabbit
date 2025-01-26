import { Metadata } from "next";

import { Card, CardContent } from "@repo/design/shadcn/card";
import RscChat from "@/app/(rag)/chat/rsc/chat";
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
      <div className="flex flex-col justify-center items-center min-h-[100dvh] pt-4 pb-8 px-4">
        <div className="w-full">
          <UiChat />
        </div>
      </div>
      <div className="absolute float-right bottom-3 right-0 text-right text-sm text-muted-foreground pr-8">
        <span className="text-muted-foreground text-xs">powered by</span>
        <a href="https://ragrabbit.com" target="_blank">
          <Image
            src="/logo_small.svg"
            alt="RagRabbit"
            width={0}
            height={0}
            className="inline-block w-7 h-7 align-text-bottom mb-[-6px] mr-[-3px]"
          />
          <span className="text-[#56A101] font-bold">RagRabbit</span>
        </a>
      </div>
    </div>
  );
}
