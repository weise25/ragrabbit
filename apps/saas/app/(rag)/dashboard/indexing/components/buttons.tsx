"use client";

import { toast } from "@repo/design/hooks/use-toast";
import { Button } from "@repo/design/shadcn/button";
import { useRouter } from "next/navigation";
import { runIndexAllAction, runEmbeddingsAction, runProcessingAction, runScrapingAction } from "../actions";
import { useIndexes } from "../providers/indexes-provider";
import { RefreshCw } from "@repo/design/base/icons";
import { Indexed, IndexStatus } from "@repo/db/schema";

interface ButtonProps {
  indexIds?: number[];
  orgId?: string;
  children?: any;
  className?: string;
  refresh?: boolean;
}

export function RefreshAllButton({ className }: { className?: string }) {
  const { refresh: refreshIndexes } = useIndexes();
  return (
    <Button
      variant="outline"
      className={className}
      onClick={async () => {
        await refreshIndexes();
      }}
    >
      <RefreshCw className="h-4 w-4" />
    </Button>
  );
}

export function IndexAllButton({ orgId, className }: { orgId: number; className?: string }) {
  const { refresh: refreshIndexes } = useIndexes();
  return (
    <Button
      variant="outline"
      className={className}
      onClick={async () => {
        await runIndexAllAction({ orgId });
        await refreshIndexes();
        toast({ title: "Indexing jobs queued" });
      }}
    >
      Index All
    </Button>
  );
}

export function ReEmbeddingsButton({ indexIds, children, className, refresh = false }: ButtonProps) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className={className}
      onClick={async () => {
        await runEmbeddingsAction({ ids: indexIds });
        toast({ title: indexIds.length === 1 ? "Page Indexed" : "Indexing jobs queued" });
        if (refresh) {
          router.refresh();
        }
      }}
    >
      {children || "Re-Index"}
    </Button>
  );
}

export function ReProcessButton({ indexIds, children, className, refresh = false }: ButtonProps) {
  const router = useRouter();
  const { patch } = useIndexes();
  return (
    <Button
      variant="outline"
      className={className}
      onClick={async () => {
        await runProcessingAction({ ids: indexIds });
        toast({ title: "Indexing job queued" });
        if (refresh) {
          router.refresh();
        } else {
          await patch(indexIds.map((id) => ({ id })));
        }
      }}
    >
      {children || "Re-Index"}
    </Button>
  );
}

export function ReScrapeButton({ indexIds, children, className, refresh = false }: ButtonProps) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className={className}
      onClick={async () => {
        await runScrapingAction({ ids: indexIds });
        toast({ title: refresh ? "Page re-scraped" : "Scraping job queued" });
        if (refresh) {
          router.refresh();
        }
      }}
    >
      {children || "Re-Scrape"}
    </Button>
  );
}
