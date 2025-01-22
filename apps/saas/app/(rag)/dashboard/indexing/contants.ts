import {
  CheckCircledIcon,
  CrossCircledIcon,
  FileIcon,
  FilePlusIcon,
  HomeIcon,
  StopwatchIcon,
} from "@radix-ui/react-icons";
import { FilesIcon, WaypointsIcon } from "@repo/design/base/icons";
import { IndexStatus } from "@repo/db/schema";
import { cellConfig } from "@repo/design/components/table/utils/default-cells";

// Cells data transformations and formatting:
export const statuses: cellConfig[] = [
  {
    value: IndexStatus.PENDING,
    label: "Pending",
    icon: StopwatchIcon,
  },
  {
    value: IndexStatus.PROCESSING,
    label: "In Progress",
    icon: StopwatchIcon,
  },
  {
    value: IndexStatus.SCRAPED,
    label: "Scraped",
    icon: FileIcon,
  },
  {
    value: IndexStatus.DONE,
    label: "Done",
    icon: CheckCircledIcon,
  },
  {
    value: IndexStatus.SKIPPED,
    label: "Skipped",
    icon: CrossCircledIcon,
  },
  {
    value: IndexStatus.ERROR,
    label: "Error",
    icon: CrossCircledIcon,
    className: "text-red-500",
  },
];

export const crawlOptions: cellConfig[] = [
  { label: "Origin", value: "origin" as any as string, icon: FilesIcon },
  { label: "Crawled", value: "crawled" as any as string, icon: WaypointsIcon },
  { label: "Single", value: "single" as any as string, icon: FilePlusIcon },
];
