import { z } from "zod";

export const getAllApiKeysSchema = z.object({
  page: z.number().min(1),
  pageSize: z.number().min(1).max(100),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
});

export const deleteApiKeySchema = z.object({
  id: z.number(),
});
