import db from "@repo/db";
import { count, eq } from "@repo/db/drizzle";
import { indexedTable } from "@repo/db/schema";
import { processWithRetry } from "@repo/rag/processing/db";

import { getPendingCountAction, runProcessingNowAction } from "../actions.processing";
import { auth } from "@repo/auth";

export const maxDuration = 30;
export const runtime = "nodejs";

export async function POST(req: Request, res: Response) {
  const { user } = await auth();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { data } = await runProcessingNowAction({});
  return new Response(JSON.stringify(data));
}

export async function GET(req: Request, res: Response) {
  const { user } = await auth();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { data } = await getPendingCountAction({});

  return new Response(JSON.stringify(data));
}
