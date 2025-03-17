"use server";
import { actionClientWithMeta, authActionClient } from "@repo/actions";
import db from "@repo/db";
import { widgetConfigSchema } from "./actions.schema";
import { revalidatePath } from "next/cache";
import { WidgetConfig, widgetConfigTable } from "@repo/db/schema/rag";
import { eq } from "@repo/db/drizzle";

export const widgetConfigAction = authActionClient
  .schema(widgetConfigSchema)
  .metadata({ name: "widgetConfig" })
  .action(async ({ parsedInput, ctx }) => {
    const update: Partial<WidgetConfig> = {
      suggestedQueries: parsedInput.suggestedQueries?.map((query) => query.value) || [],
      welcomeMessage: parsedInput.welcomeMessage,
      logoUrl: parsedInput.logoUrl,
      maxTokens: parsedInput.maxTokens,
    };

    const widgetConfig = await db
      .insert(widgetConfigTable)
      .values({
        organizationId: ctx.session.user.organizationId,
        ...update,
      })
      .onConflictDoUpdate({
        target: [widgetConfigTable.organizationId],
        set: update,
      })
      .returning();

    revalidatePath("/dashboard/widget");
    revalidatePath("/chat");
    revalidatePath("/widget/chat");
    return { success: true, data: widgetConfig };
  });

export const getWidgetConfig = actionClientWithMeta.metadata({ name: "getWidgetConfig" }).action(async ({ ctx }) => {
  const widgetConfig = await db
    .select()
    .from(widgetConfigTable)
    .where(eq(widgetConfigTable.organizationId, 1))
    .limit(1);
  return widgetConfig[0];
});
