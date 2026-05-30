"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { AnalyzeFormState } from "@/app/dashboard/analyze/form-state";

function getTextValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function submitAnalyzeFormAction(
  _prevState: AnalyzeFormState,
  formData: FormData,
): Promise<AnalyzeFormState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "You must be signed in to continue.",
    };
  }

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      status: "error",
      message:
        "Create your developer profile first so the app can compare this job with your skills.",
    };
  }

  const jobTitle = getTextValue(formData, "job_title");
  const companyName = getTextValue(formData, "company_name");
  const sourceUrl = getTextValue(formData, "source_url");
  const workType = getTextValue(formData, "work_type");
  const salaryRange = getTextValue(formData, "salary_range");
  const jobPostText = getTextValue(formData, "job_post_text");

  const fieldErrors: AnalyzeFormState["fieldErrors"] = {};

  if (!jobPostText) {
    fieldErrors.job_post_text = "Please paste a job post before running analysis.";
  }

  if (sourceUrl && !isValidHttpUrl(sourceUrl)) {
    fieldErrors.source_url = "Please enter a valid URL (http:// or https://).";
  }

  if (fieldErrors.job_post_text || fieldErrors.source_url) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  return {
    status: "success",
    message: "AI analysis will be added in the next step.",
    submitted: {
      job_title: jobTitle,
      company_name: companyName,
      source_url: sourceUrl,
      work_type: workType,
      salary_range: salaryRange,
      job_post_text: jobPostText,
    },
  };
}
