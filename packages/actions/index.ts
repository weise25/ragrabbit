//@ts-ignore
import { auth } from "@repo/auth";
import { logger } from "@repo/logger";
import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE, returnValidationErrors } from "next-safe-action";
import { z } from "zod";
import { redirect } from "next/navigation";
import { UnauthorizedError, UserError } from "@repo/core";

export const actionClient = createSafeActionClient()
  // Logger in the context:
  .use(async ({ next, ctx, metadata }) => {
    const meta = metadata as unknown as { name: string };
    const log: any = logger.child({ context: meta?.name || "Action" });
    return next({ ctx: { logger: log } });
  });

export const actionClientWithMeta = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof UnauthorizedError) {
      redirect("/api/auth/signin");
      return;
    }
    if (e instanceof UserError) {
      return e.message;
    }
    if (e instanceof Error) {
      console.error(e, "Action error");

      if ("code" in e && e.code === "23505") {
        return "Duplicate value";
      }
      return "An error occurred";
    }

    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
  defineMetadataSchema() {
    return z.object({
      name: z.string(),
      allowUnauthenticated: z.boolean().optional(),
    });
  },
});

let authActionClient = actionClientWithMeta.use(async ({ next, metadata, clientInput }) => {
  const session = await auth();
  if (metadata.allowUnauthenticated !== true && (!session || !session.user || !session.user.id)) {
    logger.child({ context: metadata.name }).info("Redirecting to signin");
    throw new UnauthorizedError("Unauthorized");
  }
  if ((clientInput as any).orgId) {
    if (session.user.organizationId !== (clientInput as any).orgId) {
      throw new UnauthorizedError("Unauthorized");
    }
  }
  return next({
    ctx: {
      session,
    },
  });
});

if (process.env.NODE_ENV === "development") {
  authActionClient = authActionClient.use(async ({ next, clientInput, metadata, ctx }) => {
    const result = await next({});
    if (result.success) {
      logger
        .child({ context: metadata.name })
        .info({ data: result.data, input: clientInput, metadata, user: ctx.session?.user }, "Action");
    } else {
      logger
        .child({ context: metadata.name })
        .error(
          { data: result, input: clientInput, metadata, user: ctx.session?.user },
          "Actions returned error: " + (result.validationErrors?._errors.join(", ") || result.serverError)
        );
    }
    return result;
  });
}

export { authActionClient, returnValidationErrors };
