"use client";

import { AlertTriangle, CheckCircle2, Loader2, Moon, Pause, Play } from "@repo/design/base/icons";
import { EasyTooltip } from "@repo/design/components/tooltip/tooltip";
import { cn } from "@repo/design/lib/utils";
import { Button, buttonVariants } from "@repo/design/shadcn/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useIndexes } from "../providers/indexes-provider";

export default function FrontendJobProcessor() {
  const sleepAfter = 5; // * 3 seconds, will wake up on mouse move anyway
  const fixedGetPendingInterval = 3000; // Fixed 3 second interval for get pending requests
  const minTimeBetweenJobs = 3000; // Minimum 3 seconds between job completions
  const rateLimitWaitTime = 60000; // 60 seconds in milliseconds

  const [pendingCount, setPendingCount] = useState<number | undefined>(undefined);
  const [sleep, setSleep] = useState(0);
  const [isExecutingGetPendingCount, setIsExecutingGetPendingCount] = useState(false);
  const [isExecutingProcessing, setIsExecutingProcessing] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState(fixedGetPendingInterval);

  const [isPaused, setIsPaused] = useState(true);
  const router = useRouter();
  const { patch: patchIndex } = useIndexes();

  // Handle rate limit countdown
  useEffect(() => {
    if (!isRateLimited || rateLimitCountdown <= 0) return;

    const timer = setTimeout(() => {
      setRateLimitCountdown((prev) => {
        if (prev <= 1) {
          setIsRateLimited(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [isRateLimited, rateLimitCountdown]);

  // Clear error message after 5 seconds
  useEffect(() => {
    if (!errorMessage) return;

    const timer = setTimeout(() => {
      setErrorMessage(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  async function executeJob(wakeUp?: boolean) {
    // Avoid executing a call if still doing the previous:
    if (isExecutingProcessing) return;
    if (!wakeUp && isExecutingGetPendingCount) return;
    // Don't do any call if it goes to sleep to not overload the server:
    if (sleep > sleepAfter) return;
    // Don't execute if rate limited
    if (isRateLimited) return;

    let res;
    const currentPauseState = wakeUp ?? isPaused;

    try {
      if (currentPauseState) {
        setIsExecutingGetPendingCount(true);
        const response = await fetch("/dashboard/indexing/api");
        res = await response.json();
        // For GET requests, always use the fixed interval
        setPollingInterval(fixedGetPendingInterval);
      } else {
        const jobStartTime = Date.now();
        setIsExecutingProcessing(true);
        const response = await fetch("/dashboard/indexing/api", {
          method: "POST",
        });

        // Calculate dynamic polling interval based on job processing time for POST requests
        const jobEndTime = Date.now();
        const jobDuration = jobEndTime - jobStartTime;
        const nextPollDelay = Math.max(0, minTimeBetweenJobs - jobDuration);
        setPollingInterval(nextPollDelay);

        // Check for rate limit error
        if (response.status === 429) {
          setIsRateLimited(true);
          setRateLimitCountdown(rateLimitWaitTime);
          return;
        }

        // Check for other errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Unknown error occurred" }));
          setErrorMessage(errorData.message || `Error: ${response.status} ${response.statusText}`);
          console.error("API error:", errorData);
          return;
        }

        res = await response.json();
        // If we processed an item, refresh the page data
        if (res?.processedIndexId) {
          await patchIndex([{ id: res.processedIndexId, status: "DONE" }]);
        }
      }

      setPendingCount(res.count);
      if (res.count === 0) {
        setSleep(sleep + 1);
      }
    } catch (error) {
      console.error("Error executing job:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsExecutingGetPendingCount(false);
      setIsExecutingProcessing(false);
    }
  }

  // Execute job based on polling interval
  useEffect(() => {
    if (isRateLimited) return;

    const interval = setInterval(executeJob, pollingInterval);
    return () => clearInterval(interval);
  }, [sleep, isPaused, isExecutingGetPendingCount, isExecutingProcessing, isRateLimited, pollingInterval]);

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

  async function wakeUp() {
    setSleep(0);
    // Resume processing
    setIsPaused(false);
    // Immediately execute processing with forced pause state
    await executeJob(false);
  }

  const isSleeping = sleep > sleepAfter;
  const isExecuting = !isPaused && isExecutingProcessing;
  return (
    <>
      <EasyTooltip
        tooltip={
          isRateLimited
            ? `Rate limit reached. Waiting ${rateLimitCountdown}s before retrying.`
            : errorMessage
              ? `Error: ${errorMessage}`
              : isSleeping
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
            isSleeping && !isRateLimited ? "opacity-50 cursor-pointer" : ""
          )}
          aria-label={isRateLimited ? "Rate limited" : isSleeping ? "Wake up" : isPaused ? "Resume" : "Pause"}
        >
          <span
            className={cn(
              "rounded-md p-1",
              isRateLimited || errorMessage
                ? "bg-red-500 text-white"
                : isSleeping
                  ? "bg-blue-500 text-white"
                  : isPaused
                    ? "bg-yellow-200"
                    : "bg-green-500 text-white"
            )}
          >
            {isRateLimited || errorMessage ? (
              <AlertTriangle className="h-4 w-4" />
            ) : isSleeping ? (
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
          {isRateLimited ? (
            <span className="flex items-center gap-1 text-red-500 font-medium">
              Rate limited ({rateLimitCountdown}s)
            </span>
          ) : errorMessage ? (
            <span className="flex items-center gap-1 text-red-500 font-medium truncate max-w-[200px]">
              Error occurred
            </span>
          ) : (
            <>
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
            </>
          )}
        </div>
      </EasyTooltip>
      <div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => (isPaused ? wakeUp() : setIsPaused(true))}
          disabled={isRateLimited || !!errorMessage}
        >
          {isSleeping || isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}
