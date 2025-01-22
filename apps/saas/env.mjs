import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Dependencies envs:
import "@repo/auth/env.mjs";
import "@repo/db/env.mjs";
import "@repo/logger/env.mjs";
import "@repo/jobs/env.mjs";
// TODO: ierrors: ../../node_modules/.pnpm/onnxruntime-node@1.14.0/node_modules/onnxruntime-node/bin/napi-v3/darwin/arm64/onnxruntime_binding.node
// also if I import rag in a action, it gives me the error
//import "@repo/rag/env.mjs";

// Utilities:
const bool = z
  .string()
  .optional()
  .transform((s) => s !== "false");
const required = z.string().min(1);
const optional = z
  .string()
  .optional()
  .refine((s) => s === undefined || s.length > 0, { message: "Can't be empty" });

export const env = createEnv({
  server: {},
  client: {},
  shared: {},
});
