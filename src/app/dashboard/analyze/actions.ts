"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type {
  AnalyzeFormState,
  JobExtractionFormState,
} from "@/app/dashboard/analyze/form-state";
import {
  extractJobDetailsWithGemini,
  InvalidJobExtractionError,
} from "@/lib/ai/job-extraction";
import {
  fetchReadableJobLinkText,
  JobLinkFetchError,
} from "@/lib/job-link-fetch";
import {
  analyzeJobWithGemini,
  InvalidAiJsonError,
} from "@/lib/ai/job-analysis";
import type { CandidateProfileForAnalysis, JobFitAnalysis } from "@/lib/ai/types";
import { getAiErrorSummary, isAiQuotaError } from "@/lib/ai/error-utils";

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

function toResumeKeywordsArray(analysis: JobFitAnalysis): string[] {
  const groupedKeywords = [
    ...analysis.resumeKeywordSuggestions.frontend,
    ...analysis.resumeKeywordSuggestions.backend,
    ...analysis.resumeKeywordSuggestions.database,
    ...analysis.resumeKeywordSuggestions.authentication,
    ...analysis.resumeKeywordSuggestions.payment,
    ...analysis.resumeKeywordSuggestions.deployment,
    ...analysis.resumeKeywordSuggestions.testing,
    ...analysis.resumeKeywordSuggestions.softSkills,
  ];

  return Array.from(new Set(groupedKeywords.filter(Boolean)));
}

function logSafeActionDiagnostics(
  label: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const summary = getAiErrorSummary(error);

  console.warn(`[analyze-action] ${label}`, {
    ...context,
    errorName: summary.errorName,
    errorMessage: summary.errorMessage,
    errorCode: summary.errorCode,
    errorStatus: summary.errorStatus,
  });
}

export async function extractJobDetailsAction(
  _prevState: JobExtractionFormState,
  formData: FormData,
): Promise<JobExtractionFormState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "You must be signed in to continue.",
    };
  }

  const jobTextInput = getTextValue(formData, "jobTextInput");
  const jobUrlInput = getTextValue(formData, "jobUrlInput");

  if (!jobTextInput && !jobUrlInput) {
    return {
      status: "error",
      message: "Paste a job post or enter a job URL first.",
      fieldErrors: {
        jobTextInput: "Paste a job post or enter a job URL first.",
      },
    };
  }

  try {
    // Extraction priority is intentionally explicit: pasted text is cleanest
    // and public URL fetch is a best-effort fallback.
    let details;

    if (jobTextInput) {
      details = await extractJobDetailsWithGemini(jobTextInput);
    } else {
      const fetchedJobLink = await fetchReadableJobLinkText(jobUrlInput);
      const extractedDetails = await extractJobDetailsWithGemini(
        fetchedJobLink.readableText,
      );

      details = {
        ...extractedDetails,
        sourceUrl: extractedDetails.sourceUrl || fetchedJobLink.sourceUrl,
      };
    }

    return {
      status: "success",
      message: "Job details extracted. Review and edit the fields before analysis.",
      details,
    };
  } catch (error) {
    if (error instanceof JobLinkFetchError) {
      return {
        status: "error",
        message: error.isLinkedIn
          ? "LinkedIn often blocks direct extraction. Please paste the job description."
          : error.message,
        fieldErrors: {
          jobUrlInput: error.message,
        },
      };
    }

    if (error instanceof InvalidJobExtractionError) {
      logSafeActionDiagnostics("extraction_failed", error, {
        reason: "invalid_extraction_json",
      });
      return {
        status: "error",
        message: "Could not extract job details. Please paste the job post manually.",
      };
    }

    if (isAiQuotaError(error)) {
      logSafeActionDiagnostics("extraction_failed", error, {
        reason: "quota_or_rate_limited",
      });

      return {
        status: "error",
        message: "AI extraction limit reached. Please wait and try again later.",
      };
    }

    logSafeActionDiagnostics("extraction_failed", error, {
      reason: "unexpected_error",
    });

    return {
      status: "error",
      message: "Could not extract job details. Please paste the job post manually.",
    };
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
    const analysisResult = await analyzeJobWithGemini(profileForAnalysis, {
      companyName,
      jobTitle,
      sourceUrl,
      workType,
      salaryRange,
      jobPostText,
    });
    const analysis = analysisResult.analysis;

    const { data: savedJob, error: jobInsertError } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        company_name: companyName || null,
        job_title: jobTitle || null,
        source_url: sourceUrl || null,
        work_type: workType || null,
        salary_range: salaryRange || null,
        job_post_text: jobPostText,
      })
      .select("id")
      .single();

    if (jobInsertError || !savedJob) {
      return {
        status: "error",
        message:
          "AI analysis succeeded, but saving the job failed. Please try again.",
      };
    }

    const { data: savedAnalysis, error: analysisInsertError } = await supabase
      .from("job_analysis")
      .insert({
        job_id: savedJob.id,
        fit_score: analysis.finalScore,
        match_label: analysis.matchLabel,
        technical_skill_score: analysis.scoreBreakdown.technicalSkillMatch,
        project_relevance_score: analysis.scoreBreakdown.projectRelevance,
        experience_match_score: analysis.scoreBreakdown.experienceMatch,
        location_match_score: analysis.scoreBreakdown.locationWorkModeMatch,
        resume_keyword_score: analysis.scoreBreakdown.resumeKeywordMatch,
        required_skills: analysis.requiredSkills,
        nice_to_have_skills: analysis.niceToHaveSkills,
        matched_skills: analysis.matchedSkills,
        partially_matched_skills: analysis.partiallyMatchedSkills,
        missing_skills: analysis.missingSkills,
        responsibilities: analysis.responsibilities,
        tools_mentioned: [],
        soft_skills: analysis.resumeKeywordSuggestions.softSkills,
        experience_level: analysis.experienceLevel || null,
        extracted_location: analysis.location || null,
        extracted_work_type: analysis.workType || null,
        red_flags: analysis.redFlags,
        summary: analysis.scoreExplanation || null,
        recommendation: analysis.matchLabel,
        raw_ai_response: analysis,
      })
      .select("id")
      .single();

    if (analysisInsertError || !savedAnalysis) {
      await supabase.from("jobs").delete().eq("id", savedJob.id);

      return {
        status: "error",
        message:
          "AI analysis succeeded, but saving the analysis failed. Please try again.",
      };
    }

    const { data: savedGeneratedApplication, error: generatedAppInsertError } =
      await supabase
        .from("generated_applications")
        .insert({
          job_id: savedJob.id,
          email_subject: analysis.generatedEmailSubject || null,
          cover_letter: analysis.generatedApplicationEmail || null,
          resume_keywords: toResumeKeywordsArray(analysis),
          interview_questions: analysis.interviewPreparationQuestions,
          status: "Draft",
        })
        .select("id")
        .single();

    if (generatedAppInsertError || !savedGeneratedApplication) {
      await supabase.from("jobs").delete().eq("id", savedJob.id);

      return {
        status: "error",
        message:
          "AI analysis succeeded, but saving the generated application failed. Please try again.",
      };
    }

    return {
      status: "success",
      message: "Analysis complete. Analysis saved.",
      model: analysisResult.model,
      analysis,
      saved: {
        jobId: savedJob.id,
        analysisId: savedAnalysis.id,
        generatedApplicationId: savedGeneratedApplication.id,
      },
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
    if (error instanceof InvalidAiJsonError) {
      logSafeActionDiagnostics("analysis_failed", error, {
        reason: "invalid_ai_json",
      });

      return {
        status: "error",
        message: error.message,
      };
    }

    if (isAiQuotaError(error)) {
      logSafeActionDiagnostics("analysis_failed", error, {
        reason: "quota_or_rate_limited",
      });

      return {
        status: "error",
        message: "AI quota limit reached. Please wait and try again later.",
      };
    }

    logSafeActionDiagnostics("analysis_failed", error, {
      reason: "unexpected_error",
    });

    return {
      status: "error",
      message:
        "We could not complete the AI analysis right now. Please try again.",
    };
  }
}
