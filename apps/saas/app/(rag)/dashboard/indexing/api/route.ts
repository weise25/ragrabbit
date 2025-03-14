import { auth } from "@repo/auth";
import { RateLimitError } from "@repo/core";
import { getPendingCount, runProcessingNow } from "../utils";

export const maxDuration = 90;
export const runtime = "nodejs";

export async function POST(req: Request, res: Response) {
  const { user } = await auth();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const data = await runProcessingNow(user.organizationId);
    return new Response(JSON.stringify(data));
  } catch (e) {
    if (e instanceof RateLimitError) {
      return new Response("Rate limit reached", { status: 429 });
    }
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function GET(req: Request, res: Response) {
  const { user } = await auth();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const data = await getPendingCount(user.organizationId);

  return new Response(JSON.stringify(data));
}
