import { z } from "zod";

export const addIndexSchema = z.object({
  urls: z
    .array(
      z.object({
        value: z.string().url(),
      })
    )
    .min(1),
});

export const removeIndexSchema = z.object({
  id: z.number().int().positive(),
});

export const removeManyIndexesSchema = z.object({
  ids: z.array(z.number().int().positive()),
});

export const runIndexingSchema = z.object({
  ids: z.array(z.number().int().positive()),
});

export const runIndexingSingleSchema = z.object({
  id: z.number().int().positive(),
});

export const runIndexAllSchema = z.object({
  orgId: z.number().int().positive(),
});

export const addCrawlSchema = z.object({
  url: z.string().url(),
  isSitemap: z.boolean().optional(),
  scrapeOptions: z.object({
    allowSubdomains: z.boolean().optional(),
    maxDepth: z.coerce.number().int().optional(),
    stripQueries: z.string().optional(),
  }),
});
