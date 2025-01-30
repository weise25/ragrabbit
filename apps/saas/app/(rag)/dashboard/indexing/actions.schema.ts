import { z } from "zod";

export const addIndexSchema = z
  .object({
    urls: z
      .array(
        z.object({
          value: z.string().url(),
        })
      )
      .min(1)
      .optional(),
    url: z.string().url().optional(),
  })
  .refine((data) => data.urls || data.url, {
    message: "Either urls or url must be provided",
  });

export const editSingleIndexSchema = z.object({
  id: z.number(),
  url: z.string().url(),
  clearFoundFrom: z.boolean().optional(),
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
  isSitemap: z.boolean(),
  scrapeOptions: z.object({
    allowSubdomains: z.boolean(),
    maxDepth: z.coerce.number(),
    stripQueries: z.string(),
  }),
});

export const updateCrawlSchema = z.object({
  id: z.number(),
  url: z.string().url(),
  isSitemap: z.boolean(),
  scrapeOptions: z.object({
    allowSubdomains: z.boolean(),
    maxDepth: z.coerce.number(),
    stripQueries: z.string(),
  }),
});
