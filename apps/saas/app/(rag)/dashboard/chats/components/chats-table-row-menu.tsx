"use client";

import type { Row } from "@repo/design/components/table/tastack";

import { Chat } from "@repo/db/schema";
import { FileSearch2, MessageSquare } from "@repo/design/base/icons";
import { Button } from "@repo/design/shadcn/button";
import Link from "next/link";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export default function ChatsTableRowMenu<TData>({ row }: DataTableRowActionsProps<TData>) {
  const chat = row.original as Chat;

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link href={`/dashboard/chats/${chat.id}`}>
          <MessageSquare className="h-4 w-4" />
          <span className="sr-only">View Chat</span>
        </Link>
      </Button>
    </div>
  );
}
