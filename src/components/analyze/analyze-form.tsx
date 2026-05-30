"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  initialAnalyzeFormState,
  initialJobExtractionFormState,
  type AnalyzeFormState,
  type JobExtractionFormState,
} from "@/app/dashboard/analyze/form-state";
import type { JobFitAnalysis } from "@/lib/ai/types";

type AnalyzeFormProps = {
  hasProfile: boolean;
  action: (
    prevState: AnalyzeFormState,
    formData: FormData,
  ) => Promise<AnalyzeFormState>;
  extractionAction: (
    prevState: JobExtractionFormState,
    formData: FormData,
  ) => Promise<JobExtractionFormState>;
};

const workTypeOptions = ["Remote", "Hybrid", "On-site"];

function getInputClass(hasError: boolean): string {
  return `w-full rounded-xl border bg-white px-3.5 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
    hasError
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
      : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
  }`;
}

function ListSection({
  title,
  items,
  emptyLabel = "None",
  className = "",
}: {
  title: string;
  items: string[];
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>
      <h5 className="text-sm font-semibold text-slate-900">{title}</h5>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
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
      )}
    </section>
  );
}

function SkillsBadgeSection({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "match" | "partial" | "missing";
}) {
  const toneClass =
    tone === "match"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "partial"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h5 className="text-sm font-semibold text-slate-900">{title}</h5>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">None</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${title}-${item}-${index}`}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function ResumeKeywordSection({
  analysis,
}: {
  analysis: JobFitAnalysis;
}) {
  const groups = [
    { key: "frontend", label: "Frontend" },
    { key: "backend", label: "Backend" },
    { key: "database", label: "Database" },
    { key: "authentication", label: "Authentication" },
    { key: "payment", label: "Payment" },
    { key: "deployment", label: "Deployment" },
    { key: "testing", label: "Testing" },
    { key: "softSkills", label: "Soft skills" },
  ] as const;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h5 className="text-sm font-semibold text-slate-900">Resume keywords</h5>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {groups.map((group) => {
          const values = analysis.resumeKeywordSuggestions[group.key];

          return (
            <div key={group.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {group.label}
              </p>
              {values.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">No suggestions</p>
              ) : (
                <p className="mt-1 text-sm text-slate-700">{values.join(", ")}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

type AnalyzeFormValues = {
  jobTitle: string;
  companyName: string;
  sourceUrl: string;
  workType: string;
  salaryRange: string;
  jobPostText: string;
};

const initialFormValues: AnalyzeFormValues = {
  jobTitle: "",
  companyName: "",
  sourceUrl: "",
  workType: "",
  salaryRange: "",
  jobPostText: "",
};

function normalizeWorkType(value: string): string {
  return workTypeOptions.includes(value) ? value : "";
}

export default function AnalyzeForm({
  hasProfile,
  action,
  extractionAction,
}: AnalyzeFormProps) {
  const [formValues, setFormValues] =
    useState<AnalyzeFormValues>(initialFormValues);
  const [showExtractionFeedback, setShowExtractionFeedback] = useState(false);
  const [showAnalysisFeedback, setShowAnalysisFeedback] = useState(false);

  async function handleAnalysisAction(
    prevState: AnalyzeFormState,
    formData: FormData,
  ): Promise<AnalyzeFormState> {
    setShowAnalysisFeedback(false);
    setShowExtractionFeedback(false);
    const nextState = await action(prevState, formData);
    setShowAnalysisFeedback(true);
    return nextState;
  }

  const [state, formAction, pending] = useActionState(
    handleAnalysisAction,
    initialAnalyzeFormState,
  );

  async function handleExtractionAction(
    prevState: JobExtractionFormState,
    formData: FormData,
  ): Promise<JobExtractionFormState> {
    setShowExtractionFeedback(false);
    setShowAnalysisFeedback(false);
    const nextState = await extractionAction(prevState, formData);
    setShowExtractionFeedback(true);

    if (nextState.status === "success" && nextState.details) {
      const details = nextState.details;
      setFormValues({
        jobTitle: details.jobTitle,
        companyName: details.companyName,
        sourceUrl: details.sourceUrl,
        workType: normalizeWorkType(details.workType),
        salaryRange: details.salaryRange,
        jobPostText: details.jobPostText,
      });
    }

    return nextState;
  }

  const [extractionState, extractionFormAction, extractionPending] =
    useActionState(handleExtractionAction, initialJobExtractionFormState);

  function updateField(field: keyof AnalyzeFormValues, value: string): void {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const submitLabel = useMemo(() => {
    if (!hasProfile) {
      return "Create profile first";
    }

    if (pending) {
      return "Preparing analysis...";
    }

    return "Analyze job fit";
  }, [hasProfile, pending]);

  const analysis = state.analysis;

  return (
    <div className="space-y-6">
      {!hasProfile ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="text-sm font-medium">
            Create your developer profile first so the app can compare this job
            with your skills.
          </p>
          <Link
            href="/dashboard/profile"
            className="mt-2 inline-flex text-sm font-semibold text-blue-700 underline-offset-4 hover:underline"
          >
            Go to Profile
          </Link>
        </div>
      ) : null}

      {showAnalysisFeedback && state.status === "error" && state.message ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      ) : null}

      {showAnalysisFeedback && state.status === "success" && state.message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div>
          <h4 className="text-base font-semibold text-slate-950">
            Add job post
          </h4>
          <p className="mt-1 text-sm text-slate-600">
            Paste a job post, upload a screenshot, or add a public job link.
            JobFit will extract the key details for you.
          </p>
        </div>

        {showExtractionFeedback &&
        extractionState.status === "error" &&
        extractionState.message ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm text-rose-700">
            {extractionState.message}
          </p>
        ) : null}

        {showExtractionFeedback &&
        extractionState.status === "success" &&
        extractionState.message ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm text-emerald-700">
            <p>{extractionState.message}</p>
            {extractionState.details?.confidenceNotes ? (
              <p className="mt-1 text-xs text-emerald-800">
                {extractionState.details.confidenceNotes}
              </p>
            ) : null}
          </div>
        ) : null}

        <form action={extractionFormAction} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="jobUrlInput"
              className="text-sm font-medium text-slate-700"
            >
              Job post URL
            </label>
            <input
              id="jobUrlInput"
              name="jobUrlInput"
              type="url"
              className={getInputClass(
                Boolean(extractionState.fieldErrors?.jobUrlInput),
              )}
              placeholder="https://company.com/careers/job-post"
            />
            {extractionState.fieldErrors?.jobUrlInput ? (
              <p className="text-xs text-rose-700">
                {extractionState.fieldErrors.jobUrlInput}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="jobTextInput"
              className="text-sm font-medium text-slate-700"
            >
              Paste job post
            </label>
            <textarea
              id="jobTextInput"
              name="jobTextInput"
              rows={7}
              className={getInputClass(
                Boolean(extractionState.fieldErrors?.jobTextInput),
              )}
              placeholder="Paste raw job post text here..."
            />
            {extractionState.fieldErrors?.jobTextInput ? (
              <p className="text-xs text-rose-700">
                {extractionState.fieldErrors.jobTextInput}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="jobImage"
              className="text-sm font-medium text-slate-700"
            >
              Upload screenshot
            </label>
            <input
              id="jobImage"
              name="jobImage"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={getInputClass(
                Boolean(extractionState.fieldErrors?.jobImage),
              )}
            />
            {extractionState.fieldErrors?.jobImage ? (
              <p className="text-xs text-rose-700">
                {extractionState.fieldErrors.jobImage}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={extractionPending}
            className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
          >
            {extractionPending ? "Extracting details..." : "Extract job details"}
          </button>
        </form>
      </section>

      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="job_title"
              className="text-sm font-medium text-slate-700"
            >
              Job title
            </label>
            <input
              id="job_title"
              name="job_title"
              disabled={!hasProfile}
              className={getInputClass(false)}
              value={formValues.jobTitle}
              onChange={(event) => updateField("jobTitle", event.target.value)}
              placeholder="Full-Stack Developer"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="company_name"
              className="text-sm font-medium text-slate-700"
            >
              Company name
            </label>
            <input
              id="company_name"
              name="company_name"
              disabled={!hasProfile}
              className={getInputClass(false)}
              value={formValues.companyName}
              onChange={(event) =>
                updateField("companyName", event.target.value)
              }
              placeholder="Acme Inc."
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="source_url" className="text-sm font-medium text-slate-700">
            Source URL
          </label>
          <input
            id="source_url"
            name="source_url"
            type="url"
            disabled={!hasProfile}
            className={getInputClass(Boolean(state.fieldErrors?.source_url))}
            value={formValues.sourceUrl}
            onChange={(event) => updateField("sourceUrl", event.target.value)}
            placeholder="https://example.com/job-post"
          />
          {state.fieldErrors?.source_url ? (
            <p className="text-xs text-rose-700">{state.fieldErrors.source_url}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="work_type" className="text-sm font-medium text-slate-700">
              Work type
            </label>
            <select
              id="work_type"
              name="work_type"
              disabled={!hasProfile}
              className={getInputClass(false)}
              value={formValues.workType}
              onChange={(event) => updateField("workType", event.target.value)}
            >
              <option value="">Select work type (optional)</option>
              {workTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="salary_range"
              className="text-sm font-medium text-slate-700"
            >
              Salary range
            </label>
            <input
              id="salary_range"
              name="salary_range"
              disabled={!hasProfile}
              className={getInputClass(false)}
              value={formValues.salaryRange}
              onChange={(event) =>
                updateField("salaryRange", event.target.value)
              }
              placeholder="$1000 - $1500 / month"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="job_post_text"
            className="text-sm font-medium text-slate-700"
          >
            Job post text *
          </label>
          <textarea
            id="job_post_text"
            name="job_post_text"
            required
            rows={10}
            disabled={!hasProfile}
            className={getInputClass(Boolean(state.fieldErrors?.job_post_text))}
            value={formValues.jobPostText}
            onChange={(event) =>
              updateField("jobPostText", event.target.value)
            }
            placeholder="Paste the full job description here..."
          />
          {state.fieldErrors?.job_post_text ? (
            <p className="text-xs text-rose-700">{state.fieldErrors.job_post_text}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={!hasProfile || pending}
          className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {submitLabel}
        </button>
      </form>

      {showAnalysisFeedback &&
      state.status === "success" &&
      state.submitted &&
      analysis ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          {state.saved?.jobId ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-emerald-800">Analysis saved</p>
              <Link
                href={`/dashboard/applications/${state.saved.jobId}`}
                className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                Open saved application
              </Link>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Fit score
              </p>
              <div className="mt-2 flex items-end gap-3">
                <p className="text-4xl font-bold tracking-tight text-slate-950">
                  {analysis.finalScore}
                </p>
                <p className="pb-1 text-sm font-semibold text-blue-700">
                  {analysis.matchLabel}
                </p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{analysis.scoreExplanation}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <p className="text-xs text-slate-700">
                  Technical: {analysis.scoreBreakdown.technicalSkillMatch}/40
                </p>
                <p className="text-xs text-slate-700">
                  Projects: {analysis.scoreBreakdown.projectRelevance}/25
                </p>
                <p className="text-xs text-slate-700">
                  Experience: {analysis.scoreBreakdown.experienceMatch}/15
                </p>
                <p className="text-xs text-slate-700">
                  Location/work mode: {analysis.scoreBreakdown.locationWorkModeMatch}/10
                </p>
                <p className="text-xs text-slate-700 sm:col-span-2">
                  Resume keywords: {analysis.scoreBreakdown.resumeKeywordMatch}/10
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h5 className="text-sm font-semibold text-slate-900">Job summary</h5>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">Title:</span> {analysis.jobTitle}
                </p>
                <p>
                  <span className="font-semibold">Company:</span> {analysis.companyName}
                </p>
                <p>
                  <span className="font-semibold">Experience:</span> {analysis.experienceLevel}
                </p>
                <p>
                  <span className="font-semibold">Work type:</span> {analysis.workType}
                </p>
                <p>
                  <span className="font-semibold">Location:</span> {analysis.location}
                </p>
                <p className="break-all">
                  <span className="font-semibold">Source URL:</span>{" "}
                  {state.submitted.source_url || "Not provided"}
                </p>
                {state.model ? (
                  <p>
                    <span className="font-semibold">Model:</span> {state.model}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SkillsBadgeSection
              title="Matched skills"
              items={analysis.matchedSkills}
              tone="match"
            />
            <SkillsBadgeSection
              title="Partially matched skills"
              items={analysis.partiallyMatchedSkills}
              tone="partial"
            />
            <SkillsBadgeSection
              title="Missing skills"
              items={analysis.missingSkills}
              tone="missing"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ListSection title="Required skills" items={analysis.requiredSkills} />
            <ListSection title="Nice-to-have skills" items={analysis.niceToHaveSkills} />
            <ListSection title="Responsibilities" items={analysis.responsibilities} />
            <ListSection title="Relevant projects" items={analysis.relevantProjects} />
            <ListSection title="Weak areas" items={analysis.weakAreas} />
            <ListSection title="Red flags" items={analysis.redFlags} emptyLabel="No major red flags identified." />
          </div>

          <ResumeKeywordSection analysis={analysis} />

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h5 className="text-sm font-semibold text-slate-900">Generated application email</h5>
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-semibold">Subject:</span> {analysis.generatedEmailSubject}
            </p>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              {analysis.generatedApplicationEmail}
            </pre>
          </section>

          <ListSection
            title="Interview preparation questions"
            items={analysis.interviewPreparationQuestions}
          />
        </section>
      ) : null}
    </div>
  );
}
