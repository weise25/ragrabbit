"use server";

import { revalidatePath } from "next/cache";

export async function revalidateCache(organizationId: string) {
  revalidatePath(`/llm.txt`);
  revalidatePath(`/llm-full.txt`);
}
