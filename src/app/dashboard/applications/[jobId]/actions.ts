"use server";

import { refresh, revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  isApplicationStatus,
  type ApplicationStatus,
} from "@/lib/application-status";
import type { ApplicationStatusFormState } from "@/app/dashboard/applications/[jobId]/form-state";

function getTextValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateApplicationStatusAction(
  _prevState: ApplicationStatusFormState,
  formData: FormData,
): Promise<ApplicationStatusFormState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "You must be signed in to update application status.",
    };
  }

  const jobId = getTextValue(formData, "job_id");
  const nextStatus = getTextValue(formData, "status");

  if (!jobId) {
    return {
      status: "error",
      message: "Missing job identifier. Please refresh and try again.",
    };
  }

  if (!isApplicationStatus(nextStatus)) {
    return {
      status: "error",
      message: "Invalid status value. Please select a valid status.",
    };
  }

  const supabase = await createClient();
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (jobError || !job) {
    return {
      status: "error",
      message: "You do not have permission to update this application.",
    };
  }

  const { data: generatedApplication, error: generatedApplicationError } =
    await supabase
      .from("generated_applications")
      .select("id")
      .eq("job_id", jobId)
      .maybeSingle();

  if (generatedApplicationError) {
    return {
      status: "error",
      message: "Unable to load application status right now. Please try again.",
    };
  }

  if (!generatedApplication) {
    return {
      status: "error",
      message:
        "No generated application record exists for this job yet, so status cannot be updated.",
    };
  }

  const { error: updateError } = await supabase
    .from("generated_applications")
    .update({
      status: nextStatus as ApplicationStatus,
    })
    .eq("job_id", jobId)
    .select("id")
    .single();

  if (updateError) {
    return {
      status: "error",
      message: "Status update failed. Please try again.",
    };
  }

  revalidatePath(`/dashboard/applications/${jobId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/applications");
  refresh();

  return {
    status: "success",
    message: `Application status updated to ${nextStatus}.`,
  };
}
