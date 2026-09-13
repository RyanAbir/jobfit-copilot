import { redirect } from "next/navigation";
import ProfileForm from "@/components/profile/profile-form";
import ExperienceEditor from "@/components/profile/experience-editor";
import EducationEditor from "@/components/profile/education-editor";
import ProjectsEditor from "@/components/profile/projects-editor";
import type { ProfileFormValues } from "@/app/dashboard/profile/form-state";
import {
  toMonthInput,
  type EducationInput,
  type ProjectInput,
  type WorkExperienceInput,
} from "@/app/dashboard/profile/structured-state";
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

type WorkExperienceRow = {
  id: string;
  company: string | null;
  title: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
  description: string | null;
};

type EducationRow = {
  id: string;
  institution: string | null;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
  description: string | null;
};

type ProjectRow = {
  id: string;
  name: string | null;
  url: string | null;
  description: string | null;
  tech_stack: string[] | null;
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

  const [
    { data: experienceData },
    { data: educationData },
    { data: projectData },
  ] = await Promise.all([
    supabase
      .from("work_experiences")
      .select(
        "id,company,title,location,start_date,end_date,is_current,description",
      )
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("education")
      .select(
        "id,institution,degree,field_of_study,start_date,end_date,is_current,description",
      )
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("profile_projects")
      .select("id,name,url,description,tech_stack")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
  ]);

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

  const experiences: WorkExperienceInput[] = ((experienceData ??
    []) as WorkExperienceRow[]).map((row) => ({
    id: row.id,
    company: row.company ?? "",
    title: row.title ?? "",
    location: row.location ?? "",
    startDate: toMonthInput(row.start_date),
    endDate: toMonthInput(row.end_date),
    isCurrent: Boolean(row.is_current),
    description: row.description ?? "",
  }));

  const education: EducationInput[] = ((educationData ??
    []) as EducationRow[]).map((row) => ({
    id: row.id,
    institution: row.institution ?? "",
    degree: row.degree ?? "",
    fieldOfStudy: row.field_of_study ?? "",
    startDate: toMonthInput(row.start_date),
    endDate: toMonthInput(row.end_date),
    isCurrent: Boolean(row.is_current),
    description: row.description ?? "",
  }));

  const projects: ProjectInput[] = ((projectData ?? []) as ProjectRow[]).map(
    (row) => ({
      id: row.id,
      name: row.name ?? "",
      url: row.url ?? "",
      description: row.description ?? "",
      techStack: Array.isArray(row.tech_stack) ? row.tech_stack.join(", ") : "",
    }),
  );

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

      <div>
        <h3 className="text-lg font-semibold text-slate-900">Resume details</h3>
        <p className="mt-1 text-sm text-slate-600">
          Structured history powers your downloadable resume and per-job
          tailoring. All optional, but the more you add, the better the output.
        </p>
      </div>

      <ExperienceEditor initialRows={experiences} />
      <EducationEditor initialRows={education} />
      <ProjectsEditor initialRows={projects} />
    </section>
  );
}
