"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import type { Row } from "@repo/design/components/table/tastack";
import { Trash } from "@repo/design/base/icons";
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
import { deleteApiKey } from "../actions";
import { ApiKeyRow } from "./api-keys-table";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  onDelete?: () => void;
}

export default function ApiKeysTableRowMenu<TData>({ row, onDelete }: DataTableRowActionsProps<TData>) {
  const apiKey = row.original as ApiKeyRow;

  const handleDelete = async () => {
    const resp = await deleteApiKey({ id: apiKey.id });
    if (resp.data.success) {
      toast({ title: "API key deleted" });
      onDelete?.();
    } else {
      toast({ title: "An error occurred", variant: "destructive" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
          <DotsHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px] [&>*]:cursor-pointer">
        <DropdownMenuItem className="" onClick={handleDelete}>
          <Trash className="mr-2 h-4 w-4" />
          Delete
          <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
