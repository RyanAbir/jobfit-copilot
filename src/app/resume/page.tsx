import { redirect } from "next/navigation";
import EmptyState from "@/components/ui/empty-state";
import ResumeDocument from "@/components/resume/resume-document";
import ResumeToolbar from "@/components/resume/resume-toolbar";
import { buildResumeData, type ProfileRecord } from "@/lib/resume";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

const PROFILE_COLUMNS =
  "full_name,target_role,location,experience_level,skills,main_tech_stack,projects,experience_summary,resume_text,portfolio_url,github_url,linkedin_url";

export default async function ResumePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <>
        <ResumeToolbar
          backHref="/dashboard"
          backLabel="Back to dashboard"
          title="Resume"
        />
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 print:hidden">
          <h3 className="text-lg font-semibold text-rose-900">Resume</h3>
          <p className="mt-2 text-sm text-rose-700">
            We could not load your profile right now. Please try again.
          </p>
        </section>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <ResumeToolbar
          backHref="/dashboard"
          backLabel="Back to dashboard"
          title="Resume"
        />
        <EmptyState
          title="Create your profile first"
          description="Your resume is generated from your developer profile. Add your details to build a downloadable resume."
          actionHref="/dashboard/profile"
          actionLabel="Go to Profile"
        />
      </>
    );
  }

  const resumeData = buildResumeData(data as ProfileRecord, user.email ?? "");

  return (
    <>
      <ResumeToolbar
        backHref="/dashboard"
        backLabel="Back to dashboard"
        title="Resume"
        subtitle="Generated from your developer profile. Use Download PDF and choose “Save as PDF”."
      />
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0">
        <ResumeDocument data={resumeData} />
      </div>
    </>
  );
}
