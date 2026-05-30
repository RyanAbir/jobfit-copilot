import { notFound, redirect } from "next/navigation";
import CopyButton from "@/components/ui/copy-button";
import ApplicationStatusForm from "@/components/applications/application-status-form";
import { updateApplicationStatusAction } from "@/app/dashboard/applications/[jobId]/actions";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  APPLICATION_STATUSES,
  isApplicationStatus,
  type ApplicationStatus,
} from "@/lib/application-status";

type JobRow = {
  id: string;
  job_title: string | null;
  company_name: string | null;
  source_url: string | null;
  location: string | null;
  work_type: string | null;
  salary_range: string | null;
  job_post_text: string;
  created_at: string;
};

type JobAnalysisRow = {
  id: string;
  fit_score: number;
  match_label: string | null;
  technical_skill_score: number;
  project_relevance_score: number;
  experience_match_score: number;
  location_match_score: number;
  resume_keyword_score: number;
  required_skills: string[] | null;
  nice_to_have_skills: string[] | null;
  matched_skills: string[] | null;
  partially_matched_skills: string[] | null;
  missing_skills: string[] | null;
  responsibilities: string[] | null;
  experience_level: string | null;
  extracted_location: string | null;
  extracted_work_type: string | null;
  red_flags: string[] | null;
  summary: string | null;
  recommendation: string | null;
  raw_ai_response: unknown;
};

type GeneratedApplicationRow = {
  id: string;
  email_subject: string | null;
  cover_letter: string | null;
  resume_keywords: string[] | null;
  interview_questions: string[] | null;
  status: string | null;
};

type ResumeKeywordGroups = {
  frontend: string[];
  backend: string[];
  database: string[];
  authentication: string[];
  payment: string[];
  deployment: string[];
  testing: string[];
  softSkills: string[];
};

function toDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function listOrFallback(items: string[], fallback = "Not available"): string[] {
  return items.length > 0 ? items : [fallback];
}

function parseResumeKeywordGroups(rawAiResponse: unknown): ResumeKeywordGroups {
  const obj = asRecord(rawAiResponse);
  const keywords = asRecord(obj?.resumeKeywordSuggestions);

  return {
    frontend: asStringArray(keywords?.frontend),
    backend: asStringArray(keywords?.backend),
    database: asStringArray(keywords?.database),
    authentication: asStringArray(keywords?.authentication),
    payment: asStringArray(keywords?.payment),
    deployment: asStringArray(keywords?.deployment),
    testing: asStringArray(keywords?.testing),
    softSkills: asStringArray(keywords?.softSkills),
  };
}

function parseWeakAreas(rawAiResponse: unknown): string[] {
  const obj = asRecord(rawAiResponse);
  return asStringArray(obj?.weakAreas);
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <ul className="mt-2 grid gap-2">
        {items.map((item, index) => (
          <li
            key={`${title}-${item}-${index}`}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function ApplicationDetailPage({
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
    .select(
      "id,job_title,company_name,source_url,location,work_type,salary_range,job_post_text,created_at",
    )
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (jobError || !jobData) {
    notFound();
  }

  const job = jobData as JobRow;

  const { data: analysisData } = await supabase
    .from("job_analysis")
    .select(
      "id,fit_score,match_label,technical_skill_score,project_relevance_score,experience_match_score,location_match_score,resume_keyword_score,required_skills,nice_to_have_skills,matched_skills,partially_matched_skills,missing_skills,responsibilities,experience_level,extracted_location,extracted_work_type,red_flags,summary,recommendation,raw_ai_response",
    )
    .eq("job_id", job.id)
    .maybeSingle();

  const analysis = (analysisData ?? null) as JobAnalysisRow | null;

  const { data: generatedData } = await supabase
    .from("generated_applications")
    .select(
      "id,email_subject,cover_letter,resume_keywords,interview_questions,status",
    )
    .eq("job_id", job.id)
    .maybeSingle();

  const generated = (generatedData ?? null) as GeneratedApplicationRow | null;
  const generatedStatus = generated?.status ?? "";
  const currentStatus: ApplicationStatus = isApplicationStatus(generatedStatus)
    ? generatedStatus
    : "Draft";

  const resumeKeywordGroups = parseResumeKeywordGroups(analysis?.raw_ai_response);
  const weakAreas = parseWeakAreas(analysis?.raw_ai_response);
  const groupedKeywordsForCopy = [
    ...resumeKeywordGroups.frontend,
    ...resumeKeywordGroups.backend,
    ...resumeKeywordGroups.database,
    ...resumeKeywordGroups.authentication,
    ...resumeKeywordGroups.payment,
    ...resumeKeywordGroups.deployment,
    ...resumeKeywordGroups.testing,
    ...resumeKeywordGroups.softSkills,
  ];
  const fallbackKeywords = asStringArray(generated?.resume_keywords);
  const keywordCopyText = (
    groupedKeywordsForCopy.length > 0 ? groupedKeywordsForCopy : fallbackKeywords
  ).join(", ");

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-950">
            {job.job_title || "Untitled role"}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {job.company_name || "Not specified"} • Saved {toDateLabel(job.created_at)}
          </p>
        </div>
        <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          Status: {currentStatus}
        </p>
      </div>

      <ApplicationStatusForm
        jobId={job.id}
        currentStatus={currentStatus}
        statusOptions={APPLICATION_STATUSES}
        action={updateApplicationStatusAction}
        hasGeneratedApplication={Boolean(generated)}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Fit score
          </p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {analysis?.fit_score ?? 0}
            </p>
            <p className="pb-1 text-sm font-semibold text-blue-700">
              {analysis?.match_label || "Not scored"}
            </p>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {analysis?.summary || "No score summary available."}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <p className="text-xs text-slate-700">
              Technical: {analysis?.technical_skill_score ?? 0}/40
            </p>
            <p className="text-xs text-slate-700">
              Projects: {analysis?.project_relevance_score ?? 0}/25
            </p>
            <p className="text-xs text-slate-700">
              Experience: {analysis?.experience_match_score ?? 0}/15
            </p>
            <p className="text-xs text-slate-700">
              Location/work mode: {analysis?.location_match_score ?? 0}/10
            </p>
            <p className="text-xs text-slate-700 sm:col-span-2">
              Resume keywords: {analysis?.resume_keyword_score ?? 0}/10
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Job metadata</h4>
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Source URL:</span>{" "}
              {job.source_url || "Not provided"}
            </p>
            <p>
              <span className="font-semibold">Work type:</span>{" "}
              {job.work_type || analysis?.extracted_work_type || "Not specified"}
            </p>
            <p>
              <span className="font-semibold">Location:</span>{" "}
              {job.location || analysis?.extracted_location || "Not specified"}
            </p>
            <p>
              <span className="font-semibold">Salary range:</span>{" "}
              {job.salary_range || "Not specified"}
            </p>
            <p>
              <span className="font-semibold">Experience level:</span>{" "}
              {analysis?.experience_level || "Not specified"}
            </p>
            <p>
              <span className="font-semibold">Recommendation:</span>{" "}
              {analysis?.recommendation || "Not specified"}
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ListCard
          title="Matched skills"
          items={listOrFallback(asStringArray(analysis?.matched_skills))}
        />
        <ListCard
          title="Partially matched skills"
          items={listOrFallback(asStringArray(analysis?.partially_matched_skills))}
        />
        <ListCard
          title="Missing skills"
          items={listOrFallback(asStringArray(analysis?.missing_skills))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard
          title="Required skills"
          items={listOrFallback(asStringArray(analysis?.required_skills))}
        />
        <ListCard
          title="Nice-to-have skills"
          items={listOrFallback(asStringArray(analysis?.nice_to_have_skills))}
        />
        <ListCard
          title="Responsibilities"
          items={listOrFallback(asStringArray(analysis?.responsibilities))}
        />
        <ListCard title="Weak areas" items={listOrFallback(weakAreas)} />
        <ListCard
          title="Red flags"
          items={listOrFallback(asStringArray(analysis?.red_flags))}
        />
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-900">
              Resume keyword suggestions
            </h4>
            <CopyButton
              value={keywordCopyText}
              label="Copy keywords"
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Frontend
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {resumeKeywordGroups.frontend.join(", ") || "No suggestions"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Backend
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {resumeKeywordGroups.backend.join(", ") || "No suggestions"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Database
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {resumeKeywordGroups.database.join(", ") || "No suggestions"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Authentication
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {resumeKeywordGroups.authentication.join(", ") || "No suggestions"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Payment
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {resumeKeywordGroups.payment.join(", ") || "No suggestions"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Deployment
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {resumeKeywordGroups.deployment.join(", ") || "No suggestions"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Testing
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {resumeKeywordGroups.testing.join(", ") || "No suggestions"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Soft skills
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {resumeKeywordGroups.softSkills.join(", ") || "No suggestions"}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-slate-900">
            Generated application email
          </h4>
          <CopyButton
            value={generated?.cover_letter || ""}
            label="Copy email"
          />
        </div>
        {generated ? (
          <>
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-semibold">Subject:</span>{" "}
              {generated.email_subject || "Not provided"}
            </p>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              {generated.cover_letter || "No generated email body available."}
            </pre>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            No generated application row found for this job yet.
          </p>
        )}
      </section>

      <ListCard
        title="Interview preparation questions"
        items={listOrFallback(asStringArray(generated?.interview_questions))}
      />

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          Original job post text
        </summary>
        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {job.job_post_text}
        </pre>
      </details>
    </section>
  );
}
