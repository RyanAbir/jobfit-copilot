"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type {
  ProfileFormFieldName,
  ProfileFormState,
} from "@/app/dashboard/profile/form-state";

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

function parseSkills(skillsInput: string): string[] {
  return skillsInput
    .split(",")
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);
}

function validateOptionalUrl(
  value: string,
  fieldName: ProfileFormFieldName,
  fieldErrors: Partial<Record<ProfileFormFieldName, string>>,
) {
  if (!value) {
    return;
  }

  if (!isValidHttpUrl(value)) {
    fieldErrors[fieldName] = "Please enter a valid URL (http:// or https://).";
  }
}

export async function saveProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "You must be signed in to save your profile.",
    };
  }

  const fullName = getTextValue(formData, "fullName");
  const targetRole = getTextValue(formData, "targetRole");
  const location = getTextValue(formData, "location");
  const experienceLevel = getTextValue(formData, "experienceLevel");
  const skillsInput = getTextValue(formData, "skills");
  const projects = getTextValue(formData, "projects");
  const portfolioUrl = getTextValue(formData, "portfolioUrl");
  const githubUrl = getTextValue(formData, "githubUrl");
  const linkedinUrl = getTextValue(formData, "linkedinUrl");
  const resumeText = getTextValue(formData, "resumeText");

  const fieldErrors: Partial<Record<ProfileFormFieldName, string>> = {};

  if (!fullName) {
    fieldErrors.fullName = "Full name is required.";
  }

  if (!targetRole) {
    fieldErrors.targetRole = "Target role is required.";
  }

  const skills = parseSkills(skillsInput);
  if (skills.length === 0) {
    fieldErrors.skills = "Please add at least one skill.";
  }

  validateOptionalUrl(portfolioUrl, "portfolioUrl", fieldErrors);
  validateOptionalUrl(githubUrl, "githubUrl", fieldErrors);
  validateOptionalUrl(linkedinUrl, "linkedinUrl", fieldErrors);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      full_name: fullName,
      target_role: targetRole,
      location: location || null,
      experience_level: experienceLevel || null,
      skills,
      projects: projects || null,
      portfolio_url: portfolioUrl || null,
      github_url: githubUrl || null,
      linkedin_url: linkedinUrl || null,
      resume_text: resumeText || null,
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    return {
      status: "error",
      message: "Unable to save profile right now. Please try again.",
    };
  }

  return {
    status: "success",
    message: "Profile saved successfully.",
  };
}
