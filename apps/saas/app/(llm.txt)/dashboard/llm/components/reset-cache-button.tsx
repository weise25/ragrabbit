"use client";

import { Button } from "@repo/design/shadcn/button";
import { RefreshCwIcon } from "@repo/design/base/icons";
import { useToast } from "@repo/design/hooks/use-toast";
import { revalidateCache } from "../actions";
import { useRouter } from "next/navigation";

interface ResetCacheButtonProps {
  organizationId: number;
}

export function ResetCacheButton({ organizationId }: ResetCacheButtonProps) {
  const { toast } = useToast();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await revalidateCache(organizationId);
        toast({
          title: "Cache Reset",
          description: "The LLM.txt cache has been successfully reset.",
        });
        router.refresh();
      }}
    >
      <RefreshCwIcon className="h-4 w-4 mr-2" />
      Reset Cache
    </Button>
  );
}
