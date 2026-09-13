"use client";

import { useState, useTransition } from "react";
import { saveProjects } from "@/app/dashboard/profile/structured-actions";
import {
  emptyProject,
  type ProjectInput,
} from "@/app/dashboard/profile/structured-state";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ProjectsEditor({
  initialRows,
}: {
  initialRows: ProjectInput[];
}) {
  const [rows, setRows] = useState<ProjectInput[]>(initialRows);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(id: string, patch: Partial<ProjectInput>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    setStatus("idle");
  }

  function addRow() {
    setRows((current) => [...current, emptyProject(newId())]);
    setStatus("idle");
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
    setStatus("idle");
  }

  function save() {
    startTransition(async () => {
      const result = await saveProjects(rows);
      if (result.ok) {
        setStatus("saved");
        setMessage("Projects saved.");
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
          <h4 className="text-base font-semibold text-slate-950">Projects</h4>
          <p className="mt-0.5 text-xs text-slate-600">
            Structured projects for your resume and tailoring.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
        >
          + Add project
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3 text-sm text-slate-500">
          No projects added yet.
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
                  value={row.name}
                  onChange={(e) => update(row.id, { name: e.target.value })}
                  placeholder="Project name"
                />
                <input
                  className={inputClass}
                  value={row.url}
                  onChange={(e) => update(row.id, { url: e.target.value })}
                  placeholder="URL (optional)"
                />
              </div>

              <input
                className={`${inputClass} mt-3`}
                value={row.techStack}
                onChange={(e) => update(row.id, { techStack: e.target.value })}
                placeholder="Tech stack, comma-separated (e.g. Next.js, Supabase)"
              />

              <textarea
                className={`${inputClass} mt-2`}
                rows={2}
                value={row.description}
                onChange={(e) =>
                  update(row.id, { description: e.target.value })
                }
                placeholder="What it does and your role. One bullet per line works well."
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
          {isPending ? "Saving..." : "Save projects"}
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
