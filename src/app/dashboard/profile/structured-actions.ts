"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type {
  EducationInput,
  ProjectInput,
  StructuredSaveResult,
  WorkExperienceInput,
} from "@/app/dashboard/profile/structured-state";

function toDate(monthValue: string | null | undefined): string | null {
  const v = (monthValue ?? "").trim();
  if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

function nullIfEmpty(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : null;
}

async function reconcile(
  table: string,
  userId: string,
  rows: Record<string, unknown>[],
): Promise<StructuredSaveResult> {
  const supabase = await createClient();

  if (rows.length > 0) {
    const { error } = await supabase.from(table).upsert(rows);
    if (error) return { ok: false, error: error.message };
  }

  const keepIds = new Set(rows.map((row) => row.id as string));
  const { data: existing, error: readError } = await supabase
    .from(table)
    .select("id")
    .eq("user_id", userId);

  if (readError) return { ok: false, error: readError.message };

  const toDelete = (existing ?? [])
    .map((row) => (row as { id: string }).id)
    .filter((id) => !keepIds.has(id));

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .in("id", toDelete);
    if (deleteError) return { ok: false, error: deleteError.message };
  }

  revalidatePath("/dashboard/profile");
  return { ok: true };
}

export async function saveWorkExperiences(
  rows: WorkExperienceInput[],
): Promise<StructuredSaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const cleaned = rows
    .filter((row) => nullIfEmpty(row.company) || nullIfEmpty(row.title))
    .map((row, index) => ({
      id: row.id,
      user_id: user.id,
      company: nullIfEmpty(row.company),
      title: nullIfEmpty(row.title),
      location: nullIfEmpty(row.location),
      start_date: toDate(row.startDate),
      end_date: row.isCurrent ? null : toDate(row.endDate),
      is_current: Boolean(row.isCurrent),
      description: nullIfEmpty(row.description),
      sort_order: index,
    }));

  return reconcile("work_experiences", user.id, cleaned);
}

export async function saveEducation(
  rows: EducationInput[],
): Promise<StructuredSaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const cleaned = rows
    .filter((row) => nullIfEmpty(row.institution) || nullIfEmpty(row.degree))
    .map((row, index) => ({
      id: row.id,
      user_id: user.id,
      institution: nullIfEmpty(row.institution),
      degree: nullIfEmpty(row.degree),
      field_of_study: nullIfEmpty(row.fieldOfStudy),
      start_date: toDate(row.startDate),
      end_date: row.isCurrent ? null : toDate(row.endDate),
      is_current: Boolean(row.isCurrent),
      description: nullIfEmpty(row.description),
      sort_order: index,
    }));

  return reconcile("education", user.id, cleaned);
}

export async function saveProjects(
  rows: ProjectInput[],
): Promise<StructuredSaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const cleaned = rows
    .filter((row) => nullIfEmpty(row.name))
    .map((row, index) => ({
      id: row.id,
      user_id: user.id,
      name: nullIfEmpty(row.name),
      url: nullIfEmpty(row.url),
      description: nullIfEmpty(row.description),
      tech_stack: (row.techStack ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      sort_order: index,
    }));

  return reconcile("profile_projects", user.id, cleaned);
}
