"use server";

import { authActionClient } from "@repo/actions";
import { getPendingCount, runProcessingNow } from "./utils";

export const runProcessingNowAction = authActionClient
  .metadata({ name: "runProcessingNow" })
  .action(async ({ ctx }) => {
    return await runProcessingNow(ctx.session.user.organizationId);
  });

export const getPendingCountAction = authActionClient.metadata({ name: "getPendingCount" }).action(async ({ ctx }) => {
  return await getPendingCount(ctx.session.user.organizationId);
});
