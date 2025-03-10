import { NextRequest } from "next/server";
import { z } from "zod";
import db from "@repo/db";
import { apiKeysTable } from "@repo/db/schema/api";
import { eq } from "@repo/db/drizzle";
import { ForbiddenError, UnauthorizedError, UserError, ValidationError } from "@repo/core";

interface ValidatedRequest<T> {
  data: T;
  organizationId: number;
  error?: Response;
}

interface ErrorResponse {
  error: Response;
}

async function validateApiKey(apiKey: string) {
  const [key] = await db
    .select({
      id: apiKeysTable.id,
      organizationId: apiKeysTable.organizationId,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.key, apiKey))
    .limit(1);

  if (!key) {
    return null;
  }

  return key;
}

export async function validateApiRequest<T>(req: NextRequest, schema: z.ZodSchema<T>): Promise<ValidatedRequest<T>> {
  // Extract and validate API key
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const apiKey = authHeader.slice(7); // Remove "Bearer " prefix
  const keyData = await validateApiKey(apiKey);

  if (!keyData) {
    throw new ForbiddenError("Invalid API key");
  }

  // Validate request body against schema
  const json = await req.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.format());
  }

  return {
    data: parsed.data,
    organizationId: keyData.organizationId,
  };
}
