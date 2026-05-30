import { redirect } from "next/navigation";
import ProfileForm from "@/components/profile/profile-form";
import type { ProfileFormValues } from "@/app/dashboard/profile/form-state";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { saveProfileAction } from "@/app/dashboard/profile/actions";

const emptyProfileValues: ProfileFormValues = {
  fullName: "",
  targetRole: "",
  location: "",
  experienceLevel: "",
  skills: "",
  projects: "",
  portfolioUrl: "",
  githubUrl: "",
  linkedinUrl: "",
  resumeText: "",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "full_name,target_role,location,experience_level,skills,projects,portfolio_url,github_url,linkedin_url,resume_text",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const hasExistingProfile = Boolean(data);
  const loadErrorMessage = error
    ? "Unable to load your saved profile. You can still submit the form to save again."
    : undefined;

  const initialValues: ProfileFormValues = data
    ? {
        fullName: data.full_name ?? "",
        targetRole: data.target_role ?? "",
        location: data.location ?? "",
        experienceLevel: data.experience_level ?? "",
        skills: Array.isArray(data.skills) ? data.skills.join(", ") : "",
        projects: data.projects ?? "",
        portfolioUrl: data.portfolio_url ?? "",
        githubUrl: data.github_url ?? "",
        linkedinUrl: data.linkedin_url ?? "",
        resumeText: data.resume_text ?? "",
      }
    : emptyProfileValues;

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-slate-950">
          Developer Profile
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Keep your profile accurate so future job analysis can compare against
          your real skills and experience.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-6">
        <ProfileForm
          action={saveProfileAction}
          initialValues={initialValues}
          hasExistingProfile={hasExistingProfile}
          loadErrorMessage={loadErrorMessage}
        />
      </div>
    </section>
  );
}
