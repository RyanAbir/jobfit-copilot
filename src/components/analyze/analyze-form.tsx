"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";
import {
  initialAnalyzeFormState,
  type AnalyzeFormState,
} from "@/app/dashboard/analyze/form-state";

type AnalyzeFormProps = {
  hasProfile: boolean;
  action: (
    prevState: AnalyzeFormState,
    formData: FormData,
  ) => Promise<AnalyzeFormState>;
};

const workTypeOptions = ["Remote", "Hybrid", "On-site"];

function getInputClass(hasError: boolean): string {
  return `w-full rounded-xl border bg-white px-3.5 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
    hasError
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
      : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
  }`;
}

export default function AnalyzeForm({ hasProfile, action }: AnalyzeFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAnalyzeFormState,
  );

  const submitLabel = useMemo(() => {
    if (!hasProfile) {
      return "Create profile first";
    }

    if (pending) {
      return "Preparing analysis...";
    }

    return "Analyze job fit";
  }, [hasProfile, pending]);

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

      {state.status === "error" && state.message ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" && state.message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      ) : null}

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
              defaultValue=""
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

      {state.status === "success" && state.submitted ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          <h4 className="text-lg font-semibold text-slate-900">
            Submitted Preview
          </h4>
          <p className="text-sm text-slate-600">
            AI analysis will be added in the next step.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Job title:</span>{" "}
              {state.submitted.job_title || "Not provided"}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Company:</span>{" "}
              {state.submitted.company_name || "Not provided"}
            </p>
            <p className="text-sm text-slate-700 break-all">
              <span className="font-semibold">Source URL:</span>{" "}
              {state.submitted.source_url || "Not provided"}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Work type:</span>{" "}
              {state.submitted.work_type || "Not provided"}
            </p>
            <p className="text-sm text-slate-700 sm:col-span-2">
              <span className="font-semibold">Salary range:</span>{" "}
              {state.submitted.salary_range || "Not provided"}
            </p>
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-slate-700">Job post text</p>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 text-xs leading-6 text-slate-700">
              {state.submitted.job_post_text}
            </pre>
          </div>
        </section>
      ) : null}
    </div>
  );
}
