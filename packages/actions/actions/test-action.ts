// You can also define global actions (ie: shared between apps) here.
"use server"; // don't forget to add this!

import { z } from "zod";
import { actionClient } from "../index";

// This schema is used to validate input from client.
const schema = z.object({
  name: z.string().min(3).max(10),
});

export const greetUser = actionClient
  .schema(schema)
  .metadata({
    name: "greetUser",
  } as any)
  .action(async ({ parsedInput: { name }, ctx: { logger } }) => {
    logger.info("Greeting user", { name });
    return { greeting: `Hello ${name}!` };
  });
