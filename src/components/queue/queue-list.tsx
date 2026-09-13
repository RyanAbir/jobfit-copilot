"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setDiscoveredJobStatus } from "@/app/dashboard/queue/actions";

export type QueueItem = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  fitScore: number | null;
  matchLabel: string;
  status: string;
  matchedSkills: string[];
  missingSkills: string[];
};

function scoreTone(score: number | null): string {
  if (score === null) return "border-slate-200 bg-slate-50 text-slate-600";
  if (score >= 80) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score >= 60) return "border-blue-200 bg-blue-50 text-blue-700";
  if (score >= 40) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function Chips({
  items,
  tone,
  max = 6,
}: {
  items: string[];
  tone: string;
  max?: number;
}) {
  if (items.length === 0) return null;
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {shown.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}
        >
          {item}
        </span>
      ))}
      {extra > 0 ? (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

export default function QueueList({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function act(id: string, status: string) {
    setPendingId(id);
    setError(null);
    startTransition(async () => {
      const result = await setDiscoveredJobStatus(id, status);
      setPendingId(null);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {items.map((item) => {
        const busy = pendingId === item.id;
        return (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h4 className="truncate text-base font-semibold text-slate-950">
                  {item.title || "Untitled role"}
                </h4>
                <p className="mt-0.5 text-sm text-slate-600">
                  {item.company || "Unknown company"}
                  {item.location ? ` • ${item.location}` : ""}
                </p>
                {item.status === "queued" ? (
                  <span className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    Ready to apply
                  </span>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div
                  className={`flex h-14 w-14 flex-col items-center justify-center rounded-full border text-center ${scoreTone(item.fitScore)}`}
                >
                  <span className="text-lg font-bold leading-none">
                    {item.fitScore ?? "–"}
                  </span>
                  <span className="text-[10px] leading-none">fit</span>
                </div>
              </div>
            </div>

            {item.matchLabel ? (
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {item.matchLabel}
              </p>
            ) : null}

            {item.matchedSkills.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Matched
                </p>
                <Chips
                  items={item.matchedSkills}
                  tone="border-emerald-200 bg-emerald-50 text-emerald-800"
                />
              </div>
            ) : null}

            {item.missingSkills.length > 0 ? (
              <div className="mt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Missing
                </p>
                <Chips
                  items={item.missingSkills}
                  tone="border-rose-200 bg-rose-50 text-rose-800"
                />
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  View posting
                </a>
              ) : null}
              {item.status === "queued" ? (
                <button
                  type="button"
                  onClick={() => act(item.id, "analyzed")}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:opacity-50"
                >
                  Unmark
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => act(item.id, "queued")}
                  disabled={busy}
                  className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-400"
                >
                  Mark ready to apply
                </button>
              )}
              <button
                type="button"
                onClick={() => act(item.id, "skipped")}
                disabled={busy}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
