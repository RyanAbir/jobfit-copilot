"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type QueueActionResult = { ok: boolean; error?: string };

const ALLOWED_STATUSES = new Set(["analyzed", "queued", "skipped"]);

export async function setDiscoveredJobStatus(
  id: string,
  status: string,
): Promise<QueueActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  if (!ALLOWED_STATUSES.has(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("discovered_jobs")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/queue");
  return { ok: true };
}
