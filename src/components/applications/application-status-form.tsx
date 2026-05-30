"use client";

import { useActionState } from "react";
import {
  initialApplicationStatusFormState,
  type ApplicationStatusFormState,
} from "@/app/dashboard/applications/[jobId]/form-state";
import type { ApplicationStatus } from "@/lib/application-status";

type ApplicationStatusFormProps = {
  jobId: string;
  currentStatus: ApplicationStatus;
  statusOptions: readonly ApplicationStatus[];
  action: (
    prevState: ApplicationStatusFormState,
    formData: FormData,
  ) => Promise<ApplicationStatusFormState>;
  hasGeneratedApplication: boolean;
};

function getInputClass(): string {
  return "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
}

export default function ApplicationStatusForm({
  jobId,
  currentStatus,
  statusOptions,
  action,
  hasGeneratedApplication,
}: ApplicationStatusFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialApplicationStatusFormState,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">Application status</h4>
      <p className="mt-1 text-sm text-slate-600">Current status: {currentStatus}</p>

      {!hasGeneratedApplication ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm text-amber-800">
          This saved job does not have a generated application row yet, so status
          updates are unavailable.
        </p>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" && state.message ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <form action={formAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="job_id" value={jobId} />
        <div className="w-full sm:max-w-xs">
          <label htmlFor="status" className="text-sm font-medium text-slate-700">
            Select status
          </label>
          <select
            id="status"
            name="status"
            className={`${getInputClass()} mt-1`}
            defaultValue={currentStatus}
            disabled={!hasGeneratedApplication || pending}
          >
            {statusOptions.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!hasGeneratedApplication || pending}
          className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {pending ? "Updating..." : "Update Status"}
        </button>
      </form>
    </section>
  );
}
