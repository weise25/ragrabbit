"use client";

import { Indexed, IndexStatus } from "@repo/db/schema";
import { WaypointsIcon } from "@repo/design/base/icons";
import { CustomColumnDev, DataTable } from "@repo/design/components/table/data-table";
import {
  addTooltip,
  columnIcon,
  columnMultiselect,
  columnText,
  getIdsFromMultiselect,
  SelectionDeleteButton,
} from "@repo/design/components/table/utils/default-columns";
import { EasyTooltip } from "@repo/design/components/tooltip/tooltip";
import { hyphenateUrl } from "@repo/design/lib/hyphenations";
import { Badge } from "@repo/design/shadcn/badge";
import { removeManyIndexesAction } from "../actions";
import { useIndexes } from "../providers/indexes-provider";
import { crawlOptions, statuses } from "../contants";
import { ReProcessButton } from "./buttons";
import IndexesTableRowMenu from "./indexes-table-row-menu";

export default function IndexesTable() {
  const { data: indexes, isLoading, remove } = useIndexes();

  // Table columns definition and faceted filters:
  const columns: CustomColumnDev<Indexed, any>[] = [
    {
      id: "select",
      ...columnMultiselect({}),
      multiselectToolbar: ({ table }) => (
        <div className="flex gap-2">
          <SelectionDeleteButton table={table} deleteAction={removeManyIndexesAction} optimisticAction={remove} />
          <ReProcessButton className="h-8" indexIds={getIdsFromMultiselect(table)}>
            Re-Index
          </ReProcessButton>
        </div>
      ),
    },
    {
      accessorKey: "doCrawl",
      ...columnIcon({ id: "doCrawl", title: "Crawl", fieldConfig: crawlOptions }),
      accessorFn: (row) => (row.doCrawl ? "origin" : row.foundFromIndexId ? "crawled" : "single"),
      defaultVisible: false,
    },
    {
      accessorKey: "url",
      size: 300,
      ...columnText({ id: "url", title: "Url" }),
      cell: ({ row }) => (
        <div>
          <EasyTooltip tooltip={row.getValue("url")}>
            <div className="flex items-start max-w-[400px]">
              <div className="truncate text-ellipsis break-all ">
                {row.original.foundFromIndexId && (
                  <WaypointsIcon className="w-4 h-4 inline text-muted-foreground mr-1" />
                )}
                {hyphenateUrl(row.getValue("url"))}
              </div>
              {row.original.source == "API" && (
                <Badge variant="secondary" className="ml-2">
                  API
                </Badge>
              )}
              {row.original.doCrawl && (
                <Badge variant="secondary" className="ml-2">
                  Origin
                </Badge>
              )}
            </div>
          </EasyTooltip>
        </div>
      ),
    },
    {
      accessorKey: "title",
      size: 400,
      ...columnText({ id: "title", title: "Title" }),
      cell: ({ row }) => {
        const empty = row.getValue("status") == IndexStatus.PENDING ? "Pending..." : "<Empty>";
        return (
          <span className="line-clamp-2">
            <EasyTooltip tooltip={row.getValue("title")}>
              {row.getValue("title") || <span className="text-muted-foreground">{empty}</span>}
            </EasyTooltip>
          </span>
        );
      },
    },
    {
      size: 100,
      accessorKey: "status",
      ...addTooltip({
        tooltip: (args) => args.row.original.error || args.row.original.skipReason,
        columnConfig: columnIcon({ id: "status", title: "Status", fieldConfig: statuses }),
      }),
    },
    {
      size: 50,
      id: "actions",
      cell: ({ row }) => <IndexesTableRowMenu row={row} />,
    },
  ];

  return <DataTable data={indexes} columns={columns} loading={isLoading} textSearchColumn="url" />;
}
