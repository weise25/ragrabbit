"use client";

import { CheckCircle2, Loader2, Moon, Pause, Play } from "@repo/design/base/icons";
import { EasyTooltip } from "@repo/design/components/tooltip/tooltip";
import { cn } from "@repo/design/lib/utils";
import { Button, buttonVariants } from "@repo/design/shadcn/button";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { getPendingCountAction, runProcessingNowAction } from "../actions";
import { revalidatePath } from "next/cache";
import { useRouter } from "next/navigation";
import { useIndexes } from "../providers/indexes-provider";

export default function FrontendJobProcessor() {
  const sleepAfter = 5; // * 3 seconds, will wake up on mouse move anyway
  const pollingInterval = 3000;

  const [pendingCount, setPendingCount] = useState<number | undefined>(undefined);
  const [sleep, setSleep] = useState(0);
  const { executeAsync: executeGetPendingCount, isExecuting: isExecutingGetPendingCount } =
    useAction(getPendingCountAction);
  const { executeAsync: executeProcessing, isExecuting: isExecutingProcessing } = useAction(runProcessingNowAction);

  const [isPaused, setIsPaused] = useState(true);
  const router = useRouter();
  const { patch: patchIndex } = useIndexes();

  // Exectute every 3 seconds, goes to sleep if no jobs are pending after 60 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      // Avoid executing a call if still doing the previous:
      if (isExecutingGetPendingCount || isExecutingProcessing) return;
      // Don't do any call if it goes to sleep to not overload the server:
      if (sleep > sleepAfter) return;

      let res;
      if (isPaused) {
        res = await executeGetPendingCount({});
      } else {
        res = await executeProcessing({});
        // If we processed an item, refresh the page data
        if (res?.data?.processedIndexId) {
          patchIndex([{ id: res.data.processedIndexId, status: "DONE" }]);
        }
      }

      setPendingCount(res.data.count);
      if (res.data.count === 0) {
        setSleep(sleep + 1);
      }
    }, pollingInterval);
    return () => clearInterval(interval);
  }, [
    sleep,
    executeProcessing,
    executeGetPendingCount,
    isPaused,
    isExecutingGetPendingCount,
    isExecutingProcessing,
    router,
  ]);

  // Add mouse movement detection to wake up the processor
  useEffect(() => {
    function handleMouseMove() {
      if (sleep > 0) {
        setSleep(0);
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [sleep]);

  function wakeUp() {
    setSleep(0);
    // Also resume processing
    setIsPaused(false);
  }

  const isSleeping = sleep > sleepAfter;
  const isExecuting = !isPaused && (isExecutingGetPendingCount || isExecutingProcessing);
  return (
    <>
      <EasyTooltip
        tooltip={
          isSleeping
            ? "Jobs Runner sleeping"
            : isPaused
              ? "Execution paused"
              : isExecuting
                ? "Executing Job..."
                : "Ready to execute: don't close this tab"
        }
      >
        <div
          className={cn(
            buttonVariants({ variant: "outline" }),
            "flex items-center gap-2",
            isSleeping ? "opacity-50 cursor-pointer" : ""
          )}
          aria-label={isSleeping ? "Wake up" : isPaused ? "Resume" : "Pause"}
        >
          <span
            className={cn(
              "rounded-md p-1",
              isSleeping ? "bg-blue-500 text-white" : isPaused ? "bg-yellow-200" : "bg-green-500 text-white"
            )}
          >
            {isSleeping ? (
              <Moon className="h-4 w-4" />
            ) : !isPaused ? (
              isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </span>
          Jobs:{" "}
          {pendingCount === undefined ? (
            "..."
          ) : pendingCount === 0 ? (
            <span className="flex items-center gap-1">
              All done <CheckCircle2 className="h-4 w-4 text-green-500" />
            </span>
          ) : (
            <span>{pendingCount}</span>
          )}
        </div>
      </EasyTooltip>
      <div>
        <Button variant="outline" size="icon" onClick={() => (isPaused ? wakeUp() : setIsPaused(true))}>
          {isSleeping || isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}
