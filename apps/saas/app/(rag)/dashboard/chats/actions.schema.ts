import { z } from "zod";

export const getAllChatsSchema = z.object({
  page: z.number().min(1).optional().default(1),
  pageSize: z.number().min(1).max(50).optional().default(10),
});
