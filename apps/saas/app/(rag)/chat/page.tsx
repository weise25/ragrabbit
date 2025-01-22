import { Metadata } from "next";

import { authOrLogin } from "@repo/auth";

import { Card, CardContent } from "@repo/design/shadcn/card";
import RscChat from "./rsc/chat";
import UiChat from "./ui/chat";

export const metadata: Metadata = {
  title: "Chat",
  description: "Chat with your documents.",
};

export const runtime = "nodejs";

export default async function ChatPage() {
  // TODO: config option to enable/disable public access
  const session = await authOrLogin();
  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chat</h2>
          <p className="text-muted-foreground">Chat with your indexed content</p>
        </div>
        <div className="flex items-center space-x-2"></div>
      </div>
      <Card>
        <CardContent className="pt-6">
          {/* Or use Server Components with: <RscChat /> */}
          <RscChat />
          {/* <UiChat /> */}
        </CardContent>
      </Card>
    </>
  );
}
