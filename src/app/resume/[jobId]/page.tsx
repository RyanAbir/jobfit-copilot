import { notFound, redirect } from "next/navigation";
import EmptyState from "@/components/ui/empty-state";
import ResumeDocument from "@/components/resume/resume-document";
import ResumeToolbar from "@/components/resume/resume-toolbar";
import {
  buildTailoredResumeData,
  keywordsFromRawResponse,
  type ProfileRecord,
} from "@/lib/resume";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

const PROFILE_COLUMNS =
  "full_name,target_role,location,experience_level,skills,main_tech_stack,projects,experience_summary,resume_text,portfolio_url,github_url,linkedin_url";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function TailoredResumePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { jobId } = await params;
  const supabase = await createClient();

  const { data: jobData, error: jobError } = await supabase
    .from("jobs")
    .select("id,job_title,company_name")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (jobError || !jobData) {
    notFound();
  }

  const job = jobData as {
    id: string;
    job_title: string | null;
    company_name: string | null;
  };

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  const backHref = `/dashboard/applications/${job.id}`;

  if (profileError || !profileData) {
    return (
      <>
        <ResumeToolbar
          backHref={backHref}
          backLabel="Back to application"
          title="Tailored resume"
        />
        <EmptyState
          title="Create your profile first"
          description="A tailored resume is generated from your developer profile plus this job's analysis. Add your profile details to continue."
          actionHref="/dashboard/profile"
          actionLabel="Go to Profile"
        />
      </>
    );
  }

  const { data: analysisData } = await supabase
    .from("job_analysis")
    .select("matched_skills,partially_matched_skills,raw_ai_response")
    .eq("job_id", job.id)
    .maybeSingle();

  const matchedSkills = asStringArray(analysisData?.matched_skills);
  const partiallyMatchedSkills = asStringArray(
    analysisData?.partially_matched_skills,
  );
  const recommendedKeywords = keywordsFromRawResponse(
    analysisData?.raw_ai_response,
  );

  const resumeData = buildTailoredResumeData(
    profileData as ProfileRecord,
    user.email ?? "",
    {
      jobTitle: job.job_title ?? "",
      companyName: job.company_name ?? "",
      matchedSkills,
      partiallyMatchedSkills,
      recommendedKeywords,
    },
  );

  const roleSummary = [job.job_title, job.company_name]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <ResumeToolbar
        backHref={backHref}
        backLabel="Back to application"
        title="Tailored resume"
        subtitle={
          roleSummary
            ? `For ${roleSummary}. Use Download PDF and choose “Save as PDF”.`
            : "Use Download PDF and choose “Save as PDF”."
        }
      />
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0">
        <ResumeDocument data={resumeData} />
      </div>
    </>
  );
}
