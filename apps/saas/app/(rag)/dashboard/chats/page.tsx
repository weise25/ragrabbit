import { Metadata } from "next";

import { authOrLogin } from "@repo/auth";

import ChatsTable, { ChatRow } from "./components/chats-table";
import { RefreshCw } from "@repo/design/base/icons";
import { Button } from "@repo/design/shadcn/button";
import { getAllChats } from "./actions";
import { useAction } from "next-safe-action/hooks";

export const metadata: Metadata = {
  title: "Index",
  description: "Control the indexing of content for your organization.",
};

export default async function ChatsPage() {
  const { data: result } = await getAllChats({ page: 1, pageSize: 10 });
  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chats</h2>
          <p className="text-muted-foreground">The list of chats that have been created by the users</p>
        </div>
        <div className="flex items-center space-x-2"></div>
      </div>
      <ChatsTable initialChats={result.chats} initialTotalCount={result.totalCount} />
    </>
  );
}
