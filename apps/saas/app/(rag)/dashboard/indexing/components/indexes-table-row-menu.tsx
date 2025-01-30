"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import type { Row } from "@repo/design/components/table/tastack";

import { Indexed } from "@repo/db/schema";
import { ExternalLink, FileSearch2, Trash } from "@repo/design/base/icons";
import { toast } from "@repo/design/hooks/use-toast";
import { Button } from "@repo/design/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@repo/design/shadcn/dropdown-menu";
import Link from "next/link";
import { removeManyIndexesAction } from "../actions";
import { useIndexes } from "../providers/indexes-provider";
import EditButton from "./edit-button";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export default function IndexesTableRowMenu<TData>({ row }: DataTableRowActionsProps<TData>) {
  const index = row.original as Indexed;
  const { remove } = useIndexes();

  const handleDelete = async () => {
    const resp = await removeManyIndexesAction({ ids: [index.id] });
    if (resp.data.success) {
      toast({ title: "Page deleted" });
      await remove([index.id]);
    } else {
      toast({ title: "An error occurred", variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link href={`/dashboard/indexing/${index.id}`}>
          <FileSearch2 className="h-4 w-4" />
          <span className="sr-only">View Content</span>
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
            <DotsHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px] [&>*]:cursor-pointer">
          <DropdownMenuItem asChild className="">
            <Link href={index.url} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Visit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <EditButton index={index} variant="ghost" className="w-full justify-start" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="" onClick={handleDelete}>
            <Trash className="mr-2 h-4 w-4" />
            Delete
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
