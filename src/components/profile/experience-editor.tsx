"use client";

import { useState, useTransition } from "react";
import { saveWorkExperiences } from "@/app/dashboard/profile/structured-actions";
import {
  emptyWorkExperience,
  type WorkExperienceInput,
} from "@/app/dashboard/profile/structured-state";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ExperienceEditor({
  initialRows,
}: {
  initialRows: WorkExperienceInput[];
}) {
  const [rows, setRows] = useState<WorkExperienceInput[]>(initialRows);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(id: string, patch: Partial<WorkExperienceInput>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    setStatus("idle");
  }

  function addRow() {
    setRows((current) => [...current, emptyWorkExperience(newId())]);
    setStatus("idle");
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
    setStatus("idle");
  }

  function save() {
    startTransition(async () => {
      const result = await saveWorkExperiences(rows);
      if (result.ok) {
        setStatus("saved");
        setMessage("Work experience saved.");
      } else {
        setStatus("error");
        setMessage(result.error ?? "Could not save. Please try again.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-950">
            Work experience
          </h4>
          <p className="mt-0.5 text-xs text-slate-600">
            Used to generate a real, structured resume.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
        >
          + Add role
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3 text-sm text-slate-500">
          No roles added yet. Add your work history to improve tailored resumes.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className={inputClass}
                  value={row.title}
                  onChange={(e) => update(row.id, { title: e.target.value })}
                  placeholder="Job title (e.g. Full-Stack Developer)"
                />
                <input
                  className={inputClass}
                  value={row.company}
                  onChange={(e) => update(row.id, { company: e.target.value })}
                  placeholder="Company"
                />
                <input
                  className={inputClass}
                  value={row.location}
                  onChange={(e) => update(row.id, { location: e.target.value })}
                  placeholder="Location (optional)"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    className={inputClass}
                    value={row.startDate}
                    onChange={(e) =>
                      update(row.id, { startDate: e.target.value })
                    }
                    aria-label="Start month"
                  />
                  <input
                    type="month"
                    className={inputClass}
                    value={row.endDate}
                    disabled={row.isCurrent}
                    onChange={(e) => update(row.id, { endDate: e.target.value })}
                    aria-label="End month"
                  />
                </div>
              </div>

              <label className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={row.isCurrent}
                  onChange={(e) =>
                    update(row.id, { isCurrent: e.target.checked })
                  }
                />
                I currently work here
              </label>

              <textarea
                className={`${inputClass} mt-2`}
                rows={3}
                value={row.description}
                onChange={(e) =>
                  update(row.id, { description: e.target.value })
                }
                placeholder="What you did and shipped. One bullet per line works well."
              />

              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {isPending ? "Saving..." : "Save work experience"}
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
