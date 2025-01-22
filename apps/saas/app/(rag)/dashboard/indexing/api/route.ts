import db from "@repo/db";
import { count, eq } from "@repo/db/drizzle";
import { indexedTable } from "@repo/db/schema";
import { processWithRetry } from "@repo/rag/processing/db";

export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(req: Request, res: Response) {
  const body = await req.json();
  const { id } = body;

  return new Response(JSON.stringify(await processWithRetry(id)));
}

export async function GET(req: Request, res: Response) {
  //TODO auth
  const [pendingCount] = await db
    .select({ count: count() })
    .from(indexedTable)
    .where(eq(indexedTable.status, "PENDING"));

  return new Response(JSON.stringify({ pendingCount }));
}
