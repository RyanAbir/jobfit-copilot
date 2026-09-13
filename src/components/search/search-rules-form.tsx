"use client";

import { useState, useTransition, type ReactNode } from "react";
import { saveSearchRule } from "@/app/dashboard/search/actions";
import {
  WORK_TYPE_OPTIONS,
  type SearchRuleValues,
} from "@/app/dashboard/search/search-state";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {children}
    </div>
  );
}

export default function SearchRulesForm({
  initialValues,
}: {
  initialValues: SearchRuleValues;
}) {
  const [values, setValues] = useState<SearchRuleValues>(initialValues);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof SearchRuleValues>(
    key: K,
    value: SearchRuleValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setStatus("idle");
  }

  function toggleWorkType(option: string) {
    setValues((current) => {
      const has = current.workTypes.includes(option);
      return {
        ...current,
        workTypes: has
          ? current.workTypes.filter((item) => item !== option)
          : [...current.workTypes, option],
      };
    });
    setStatus("idle");
  }

  function save() {
    startTransition(async () => {
      const result = await saveSearchRule(values);
      if (result.ok) {
        setStatus("saved");
        setMessage("Search rules saved.");
      } else {
        setStatus("error");
        setMessage(result.error ?? "Could not save. Please try again.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h4 className="text-base font-semibold text-slate-950">Search rules</h4>
      <p className="mt-0.5 text-xs text-slate-600">
        What to look for and how strictly to match. Used when discovery runs.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Rule name">
          <input
            className={inputClass}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="My search"
          />
        </Field>
        <Field label="Seniority" hint="Comma-separated (e.g. Junior, Mid)">
          <input
            className={inputClass}
            value={values.seniority}
            onChange={(e) => set("seniority", e.target.value)}
            placeholder="Junior, Mid"
          />
        </Field>
        <Field label="Job titles" hint="Comma-separated">
          <input
            className={inputClass}
            value={values.titles}
            onChange={(e) => set("titles", e.target.value)}
            placeholder="Full-Stack Developer, Frontend Engineer"
          />
        </Field>
        <Field label="Locations" hint="Comma-separated (e.g. Remote, Dhaka)">
          <input
            className={inputClass}
            value={values.locations}
            onChange={(e) => set("locations", e.target.value)}
            placeholder="Remote, Dhaka"
          />
        </Field>
        <Field label="Must-have keywords" hint="Comma-separated">
          <input
            className={inputClass}
            value={values.mustHaveKeywords}
            onChange={(e) => set("mustHaveKeywords", e.target.value)}
            placeholder="React, Node"
          />
        </Field>
        <Field label="Exclude keywords" hint="Comma-separated">
          <input
            className={inputClass}
            value={values.excludeKeywords}
            onChange={(e) => set("excludeKeywords", e.target.value)}
            placeholder="Senior, PHP"
          />
        </Field>
        <Field label="Company blocklist" hint="Comma-separated">
          <input
            className={inputClass}
            value={values.companyBlocklist}
            onChange={(e) => set("companyBlocklist", e.target.value)}
            placeholder="Companies to skip"
          />
        </Field>
        <Field label="Minimum salary" hint="Optional, numeric">
          <input
            type="number"
            className={inputClass}
            value={values.minSalary}
            onChange={(e) => set("minSalary", e.target.value)}
            placeholder="e.g. 1000"
          />
        </Field>
        <Field
          label={`Minimum fit score: ${values.minFitScore}`}
          hint="Only queue jobs scoring at or above this"
        >
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={values.minFitScore}
            onChange={(e) => set("minFitScore", Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </Field>
        <Field label="Daily cap" hint="Max applications per day (used later)">
          <input
            type="number"
            min={0}
            max={200}
            className={inputClass}
            value={values.dailyCap}
            onChange={(e) => set("dailyCap", Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-slate-700">Work type</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {WORK_TYPE_OPTIONS.map((option) => {
            const active = values.workTypes.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleWorkType(option)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-blue-300 bg-blue-50 text-blue-800"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={values.autoApply}
            onChange={(e) => set("autoApply", e.target.checked)}
          />
          Enable auto-apply for this search
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Auto-submit is not active yet — this preference is saved for a later
          phase. Until then, discovered jobs land in your review queue.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {isPending ? "Saving..." : "Save search rules"}
        </button>
        {status !== "idle" && message ? (
          <span
            className={`text-sm ${status === "saved" ? "text-emerald-700" : "text-rose-700"}`}
          >
            {message}
          </span>
        ) : null}
      </div>
    </section>
  );
}
