"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type {
  ActionResult,
  SearchRuleValues,
} from "@/app/dashboard/search/search-state";

function toList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampInt(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export async function saveSearchRule(
  values: SearchRuleValues,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const supabase = await createClient();
  const parsedSalary = Number.parseInt(values.minSalary, 10);

  const row = {
    user_id: user.id,
    name: values.name.trim() || "My search",
    titles: toList(values.titles),
    locations: toList(values.locations),
    work_types: values.workTypes,
    seniority: toList(values.seniority),
    min_salary: Number.isFinite(parsedSalary) ? parsedSalary : null,
    must_have_keywords: toList(values.mustHaveKeywords),
    exclude_keywords: toList(values.excludeKeywords),
    min_fit_score: clampInt(values.minFitScore, 0, 100, 70),
    daily_cap: clampInt(values.dailyCap, 0, 200, 10),
    company_blocklist: toList(values.companyBlocklist),
    auto_apply: Boolean(values.autoApply),
    is_active: true,
  };

  if (values.id) {
    const { error } = await supabase
      .from("search_rules")
      .update(row)
      .eq("id", values.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("search_rules").insert(row);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/search");
  return { ok: true };
}

export async function addJobSource(boardToken: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const token = boardToken.trim();
  if (!token) return { ok: false, error: "Enter a Greenhouse board token." };

  const supabase = await createClient();
  const { error } = await supabase.from("job_sources").insert({
    user_id: user.id,
    type: "greenhouse",
    config: { board_token: token },
    label: token,
    is_active: true,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/search");
  return { ok: true };
}

export async function setJobSourceActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("job_sources")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/search");
  return { ok: true };
}

export async function deleteJobSource(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("job_sources")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/search");
  return { ok: true };
}
