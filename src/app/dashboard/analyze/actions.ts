"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { AnalyzeFormState } from "@/app/dashboard/analyze/form-state";
import {
  analyzeJobWithGemini,
  InvalidAiJsonError,
  MissingGeminiApiKeyError,
} from "@/lib/ai/job-analysis";
import type { CandidateProfileForAnalysis } from "@/lib/ai/types";
import { getGeminiModelName } from "@/lib/ai/gemini";

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
    .select(
      "full_name,target_role,location,experience_level,skills,main_tech_stack,projects,experience_summary,resume_text,portfolio_url,github_url,linkedin_url",
    )
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

  const profileForAnalysis: CandidateProfileForAnalysis = {
    fullName:
      typeof profile.full_name === "string" ? profile.full_name.trim() : "",
    targetRole:
      typeof profile.target_role === "string" ? profile.target_role.trim() : "",
    location: typeof profile.location === "string" ? profile.location.trim() : "",
    experienceLevel:
      typeof profile.experience_level === "string"
        ? profile.experience_level.trim()
        : "",
    skills: Array.isArray(profile.skills)
      ? profile.skills.filter((skill): skill is string => typeof skill === "string")
      : [],
    mainTechStack: Array.isArray(profile.main_tech_stack)
      ? profile.main_tech_stack.filter(
          (tech): tech is string => typeof tech === "string",
        )
      : [],
    projects: typeof profile.projects === "string" ? profile.projects.trim() : "",
    experienceSummary:
      typeof profile.experience_summary === "string"
        ? profile.experience_summary.trim()
        : "",
    resumeText:
      typeof profile.resume_text === "string" ? profile.resume_text.trim() : "",
    portfolioUrl:
      typeof profile.portfolio_url === "string" ? profile.portfolio_url.trim() : "",
    githubUrl:
      typeof profile.github_url === "string" ? profile.github_url.trim() : "",
    linkedinUrl:
      typeof profile.linkedin_url === "string" ? profile.linkedin_url.trim() : "",
  };

  try {
    const analysis = await analyzeJobWithGemini(profileForAnalysis, {
      companyName,
      jobTitle,
      sourceUrl,
      workType,
      salaryRange,
      jobPostText,
    });

    return {
      status: "success",
      message: "Analysis complete.",
      model: getGeminiModelName(),
      analysis,
      submitted: {
        job_title: jobTitle,
        company_name: companyName,
        source_url: sourceUrl,
        work_type: workType,
        salary_range: salaryRange,
        job_post_text: jobPostText,
      },
    };
  } catch (error) {
    if (error instanceof MissingGeminiApiKeyError) {
      return {
        status: "error",
        message: error.message,
      };
    }

    if (error instanceof InvalidAiJsonError) {
      return {
        status: "error",
        message: error.message,
      };
    }

    return {
      status: "error",
      message:
        "We could not complete the AI analysis right now. Please try again.",
    };
  }
}
