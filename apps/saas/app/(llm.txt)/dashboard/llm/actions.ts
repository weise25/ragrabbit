"use server";

import { revalidatePath } from "next/cache";

export async function revalidateCache(organizationId: number) {
  revalidatePath(`/llm.txt`);
  revalidatePath(`/llm-full.txt`);
}
