import { z } from "zod";

export const widgetConfigSchema = z.object({
  suggestedQueries: z.array(z.object({ value: z.string() })).optional(),
  welcomeMessage: z.string().optional(),
  logoUrl: z.string().url().optional(),
  maxTokens: z.coerce.number().int().min(1),
});
