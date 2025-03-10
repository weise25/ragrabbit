"use client";

import { CustomColumnDev, DataTable } from "@repo/design/components/table/data-table";
import { columnMultiselect, columnText } from "@repo/design/components/table/utils/default-columns";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useState } from "react";
import { getAllApiKeys } from "../actions";
import { toast } from "@repo/design/hooks/use-toast";
import { format } from "date-fns";
import ApiKeysTableRowMenu from "./api-keys-table-row-menu";

export interface ApiKeyRow {
  id: number;
  name: string;
  createdAt: Date;
}

export interface ApiKeysTableProps {
  initialApiKeys: ApiKeyRow[];
  initialTotalCount: number;
}

export default function ApiKeysTable({ initialApiKeys, initialTotalCount }: ApiKeysTableProps) {
  const [data, setData] = useState<ApiKeyRow[]>(initialApiKeys);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);

  const { executeAsync } = useAction(getAllApiKeys);

  const fetchData = useCallback(
    async (page: number, pageSize: number) => {
      setLoading(true);
      try {
        const result = await executeAsync({ page, pageSize });
        if (result.data) {
          setData(result.data.apiKeys);
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

  const handleDelete = useCallback(() => {
    fetchData(1, 10);
  }, [fetchData]);

  // Table columns definition:
  const columns: CustomColumnDev<ApiKeyRow, any>[] = [
    {
      id: "select",
      ...columnMultiselect({}),
    },
    {
      accessorKey: "name",
      size: 200,
      ...columnText({ id: "name", title: "Name" }),
    },
    {
      accessorKey: "createdAt",
      size: 150,
      ...columnText({ id: "createdAt", title: "Created" }),
      cell: ({ row }) => (
        <div className="text-muted-foreground">{format(new Date(row.getValue("createdAt")), "MMM d, yyyy")}</div>
      ),
    },
    {
      id: "actions",
      size: 20,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ApiKeysTableRowMenu row={row} onDelete={handleDelete} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      textSearchColumn="name"
      totalCount={totalCount}
      onPaginationChange={fetchData}
    />
  );
}
