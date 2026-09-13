"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addJobSource,
  deleteJobSource,
  setJobSourceActive,
} from "@/app/dashboard/search/actions";
import type { JobSourceItem } from "@/app/dashboard/search/search-state";

export default function SourcesEditor({
  sources,
}: {
  sources: JobSourceItem[];
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function report(result: { ok: boolean; error?: string }, okMsg?: string) {
    if (result.ok) {
      setIsError(false);
      setMessage(okMsg ?? null);
      router.refresh();
    } else {
      setIsError(true);
      setMessage(result.error ?? "Something went wrong.");
    }
  }

  function add() {
    startTransition(async () => {
      const result = await addJobSource(token);
      if (result.ok) setToken("");
      report(result, "Source added.");
    });
  }

  function toggle(id: string, next: boolean) {
    startTransition(async () => {
      report(await setJobSourceActive(id, next));
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      report(await deleteJobSource(id), "Source removed.");
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h4 className="text-base font-semibold text-slate-950">Job sources</h4>
      <p className="mt-0.5 text-xs text-slate-600">
        Greenhouse board tokens to discover jobs from. The token is the company
        slug in a Greenhouse board URL, e.g.{" "}
        <span className="font-mono text-slate-700">boards.greenhouse.io/</span>
        <span className="font-mono font-semibold text-slate-900">acme</span>.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Greenhouse board token (e.g. acme)"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          disabled={isPending || token.trim().length === 0}
          className="shrink-0 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          Add source
        </button>
      </div>

      {message ? (
        <p
          className={`mt-3 text-sm ${isError ? "text-rose-700" : "text-emerald-700"}`}
        >
          {message}
        </p>
      ) : null}

      <div className="mt-4">
        {sources.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3 text-sm text-slate-500">
            No sources yet. Add a Greenhouse board token to start discovering
            jobs.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
            {sources.map((source) => (
              <li
                key={source.id}
                className="flex items-center justify-between gap-3 bg-white px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {source.boardToken || source.label || "Untitled source"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {source.type}
                    {source.isActive ? "" : " · paused"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(source.id, !source.isActive)}
                    disabled={isPending}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
                  >
                    {source.isActive ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(source.id)}
                    disabled={isPending}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
