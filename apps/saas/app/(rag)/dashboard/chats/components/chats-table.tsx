"use client";

import { Chat, Indexed } from "@repo/db/schema";
import { CustomColumnDev, DataTable } from "@repo/design/components/table/data-table";
import {
  columnMultiselect,
  columnText,
  SelectionDeleteButton,
} from "@repo/design/components/table/utils/default-columns";
import ChatsTableRowMenu from "./chats-table-row-menu";
import { HashAvatar } from "@repo/design/components/avatar/hash-avatar";
import { EasyTooltip } from "@repo/design/components/tooltip/tooltip";
import { TooltipContent } from "@repo/design/shadcn/tooltip";
import { Tooltip, TooltipTrigger } from "@repo/design/shadcn/tooltip";
import { TooltipProvider } from "@repo/design/shadcn/tooltip";
import { getAllChats } from "../actions";
import { useCallback, useEffect, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "@repo/design/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export type ChatRow = { id: string; title: string; messageCount: number; totalTokens: number };

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export interface ChatsTableProps {
  initialChats: ChatRow[];
  initialTotalCount: number;
}

export default function ChatsTable({ initialChats, initialTotalCount }: ChatsTableProps) {
  const [data, setData] = useState<ChatRow[]>(initialChats);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);

  const { executeAsync } = useAction(getAllChats);

  const fetchData = useCallback(
    async (page: number, pageSize: number) => {
      setLoading(true);
      try {
        const result = await executeAsync({ page, pageSize });
        if (result.data) {
          setData(result.data.chats);
          setTotalCount(result.data.totalCount);
        }
        if (result.serverError) {
          toast({ title: "An error occurred", variant: "destructive" });
        }
      } finally {
        setLoading(false);
      }
    },
    [executeAsync]
  );

  // Table columns definition and faceted filters:
  const columns: CustomColumnDev<ChatRow, any>[] = [
    {
      id: "select",
      ...columnMultiselect({}),
    },
    {
      accessorKey: "userId",
      size: 20,
      ...columnText({ id: "userId", title: "User" }),
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HashAvatar hash={row.getValue("userId")} />
            </TooltipTrigger>
            <TooltipContent>
              <p>{row.getValue("userId")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: "title",
      size: 300,
      ...columnText({ id: "title", title: "Title" }),
      cell: ({ row }) => <div className="truncate">{capitalize(row.getValue("title") || "Untitled")}</div>,
    },
    {
      accessorKey: "messageCount",
      ...columnText({ id: "messageCount", title: "Messages" }),
      cell: ({ row }) => <div className="text-muted-foreground"># {row.getValue("messageCount")}</div>,
    },
    {
      accessorKey: "totalTokens",
      ...columnText({ id: "totalTokens", title: "Total Tokens" }),
      cell: ({ row }) => <div className="text-muted-foreground"># {row.getValue("totalTokens") || 0}</div>,
    },
    {
      accessorKey: "createdAt",
      ...columnText({ id: "createdAt", title: "Date" }),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        if (!date) return;
        return <div className="text-muted-foreground">{formatDistanceToNow(date, { addSuffix: true })}</div>;
      },
    },
    {
      size: 50,
      id: "actions",
      cell: ({ row }) => <ChatsTableRowMenu row={row} />,
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      textSearchColumn="title"
      totalCount={totalCount}
      onPaginationChange={fetchData}
    />
  );
}
