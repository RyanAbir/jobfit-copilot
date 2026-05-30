"use client";

import { useActionState, useMemo, useState } from "react";
import {
  initialProfileFormState,
  type ProfileFormValues,
} from "@/app/dashboard/profile/form-state";
import { saveProfileAction } from "@/app/dashboard/profile/actions";

type ProfileFormProps = {
  initialValues: ProfileFormValues;
  hasExistingProfile: boolean;
  loadErrorMessage?: string;
};

function getInputClass(hasError: boolean): string {
  return `w-full rounded-xl border bg-white px-3.5 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
    hasError
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
      : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
  }`;
}

export default function ProfileForm({
  initialValues,
  hasExistingProfile,
  loadErrorMessage,
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    saveProfileAction,
    initialProfileFormState,
  );
  const [formValues, setFormValues] = useState<ProfileFormValues>(initialValues);

  const submitLabel = useMemo(() => {
    if (pending) {
      return hasExistingProfile ? "Updating profile..." : "Saving profile...";
    }

    return hasExistingProfile ? "Update profile" : "Save profile";
  }, [hasExistingProfile, pending]);

  function updateField<K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K],
  ) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form action={formAction} className="space-y-5">
      {loadErrorMessage ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm text-amber-800">
          {loadErrorMessage}
        </p>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="fullName"
            className="text-sm font-medium text-slate-700"
          >
            Full name *
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            value={formValues.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            className={getInputClass(Boolean(state.fieldErrors?.fullName))}
            placeholder="Your full name"
          />
          {state.fieldErrors?.fullName ? (
            <p className="text-xs text-rose-700">{state.fieldErrors.fullName}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="targetRole"
            className="text-sm font-medium text-slate-700"
          >
            Target role *
          </label>
          <input
            id="targetRole"
            name="targetRole"
            required
            value={formValues.targetRole}
            onChange={(event) => updateField("targetRole", event.target.value)}
            className={getInputClass(Boolean(state.fieldErrors?.targetRole))}
            placeholder="Full-Stack Developer"
          />
          {state.fieldErrors?.targetRole ? (
            <p className="text-xs text-rose-700">
              {state.fieldErrors.targetRole}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="location" className="text-sm font-medium text-slate-700">
            Location
          </label>
          <input
            id="location"
            name="location"
            value={formValues.location}
            onChange={(event) => updateField("location", event.target.value)}
            className={getInputClass(false)}
            placeholder="Bangladesh / Remote"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="experienceLevel"
            className="text-sm font-medium text-slate-700"
          >
            Experience level
          </label>
          <input
            id="experienceLevel"
            name="experienceLevel"
            value={formValues.experienceLevel}
            onChange={(event) =>
              updateField("experienceLevel", event.target.value)
            }
            className={getInputClass(false)}
            placeholder="Junior to Mid-level"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="skills" className="text-sm font-medium text-slate-700">
          Skills (comma-separated) *
        </label>
        <input
          id="skills"
          name="skills"
          required
          value={formValues.skills}
          onChange={(event) => updateField("skills", event.target.value)}
          className={getInputClass(Boolean(state.fieldErrors?.skills))}
          placeholder="React, Next.js, Node.js"
        />
        {state.fieldErrors?.skills ? (
          <p className="text-xs text-rose-700">{state.fieldErrors.skills}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="projects" className="text-sm font-medium text-slate-700">
          Projects
        </label>
        <textarea
          id="projects"
          name="projects"
          rows={4}
          value={formValues.projects}
          onChange={(event) => updateField("projects", event.target.value)}
          className={getInputClass(false)}
          placeholder="List your relevant projects and short details."
        />
      </div>

      <div className="grid gap-4">
        <div className="space-y-1.5">
          <label
            htmlFor="portfolioUrl"
            className="text-sm font-medium text-slate-700"
          >
            Portfolio URL
          </label>
          <input
            id="portfolioUrl"
            name="portfolioUrl"
            type="url"
            value={formValues.portfolioUrl}
            onChange={(event) => updateField("portfolioUrl", event.target.value)}
            className={getInputClass(Boolean(state.fieldErrors?.portfolioUrl))}
            placeholder="https://yourportfolio.com"
          />
          {state.fieldErrors?.portfolioUrl ? (
            <p className="text-xs text-rose-700">
              {state.fieldErrors.portfolioUrl}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="githubUrl"
              className="text-sm font-medium text-slate-700"
            >
              GitHub URL
            </label>
            <input
              id="githubUrl"
              name="githubUrl"
              type="url"
              value={formValues.githubUrl}
              onChange={(event) => updateField("githubUrl", event.target.value)}
              className={getInputClass(Boolean(state.fieldErrors?.githubUrl))}
              placeholder="https://github.com/username"
            />
            {state.fieldErrors?.githubUrl ? (
              <p className="text-xs text-rose-700">{state.fieldErrors.githubUrl}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="linkedinUrl"
              className="text-sm font-medium text-slate-700"
            >
              LinkedIn URL
            </label>
            <input
              id="linkedinUrl"
              name="linkedinUrl"
              type="url"
              value={formValues.linkedinUrl}
              onChange={(event) => updateField("linkedinUrl", event.target.value)}
              className={getInputClass(Boolean(state.fieldErrors?.linkedinUrl))}
              placeholder="https://linkedin.com/in/username"
            />
            {state.fieldErrors?.linkedinUrl ? (
              <p className="text-xs text-rose-700">
                {state.fieldErrors.linkedinUrl}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="resumeText" className="text-sm font-medium text-slate-700">
          Resume text
        </label>
        <textarea
          id="resumeText"
          name="resumeText"
          rows={8}
          value={formValues.resumeText}
          onChange={(event) => updateField("resumeText", event.target.value)}
          className={getInputClass(false)}
          placeholder="Paste your resume text here."
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {submitLabel}
      </button>
    </form>
  );
}
