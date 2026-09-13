"use client";

import { useMemo, useState } from "react";

export type KeywordGroups = {
  frontend: string[];
  backend: string[];
  database: string[];
  authentication: string[];
  payment: string[];
  deployment: string[];
  testing: string[];
  softSkills: string[];
};

type KeywordOptimizerProps = {
  groups: KeywordGroups;
  missingSkills: string[];
  requiredSkills: string[];
};

const GROUP_LABELS: { key: keyof KeywordGroups; label: string }[] = [
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend" },
  { key: "database", label: "Database" },
  { key: "authentication", label: "Authentication" },
  { key: "payment", label: "Payment" },
  { key: "deployment", label: "Deployment" },
  { key: "testing", label: "Testing" },
  { key: "softSkills", label: "Soft skills" },
];

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = normalizeKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export default function KeywordOptimizer({
  groups,
  missingSkills,
  requiredSkills,
}: KeywordOptimizerProps) {
  const allKeywords = useMemo(() => {
    const flat = GROUP_LABELS.flatMap((group) => groups[group.key]);
    return unique([...flat, ...missingSkills, ...requiredSkills]);
  }, [groups, missingSkills, requiredSkills]);

  // Keywords the user has marked as already present in their resume.
  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const missingKeySet = useMemo(
    () => new Set(missingSkills.map(normalizeKey)),
    [missingSkills],
  );
  const requiredKeySet = useMemo(
    () => new Set(requiredSkills.map(normalizeKey)),
    [requiredSkills],
  );

  const total = allKeywords.length;
  const coveredCount = allKeywords.filter((keyword) =>
    included.has(normalizeKey(keyword)),
  ).length;
  const coverage = total === 0 ? 0 : Math.round((coveredCount / total) * 100);

  const gapKeywords = allKeywords.filter(
    (keyword) => !included.has(normalizeKey(keyword)),
  );

  function toggle(keyword: string) {
    const key = normalizeKey(keyword);
    setIncluded((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectAll() {
    setIncluded(new Set(allKeywords.map(normalizeKey)));
  }

  function clearAll() {
    setIncluded(new Set());
  }

  async function copyText(text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    setTimeout(() => setCopyStatus("idle"), 1500);
  }

  const coverageTone =
    coverage >= 75
      ? "text-emerald-700"
      : coverage >= 40
        ? "text-amber-700"
        : "text-rose-700";

  const barTone =
    coverage >= 75
      ? "bg-emerald-500"
      : coverage >= 40
        ? "bg-amber-500"
        : "bg-rose-500";

  const copyLabel =
    copyStatus === "copied"
      ? "Copied"
      : copyStatus === "failed"
        ? "Copy failed"
        : null;

  if (total === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900">
          Resume keyword optimizer
        </h4>
        <p className="mt-2 text-sm text-slate-500">
          No keyword suggestions were generated for this analysis.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Resume keyword optimizer
          </h4>
          <p className="mt-1 text-xs text-slate-600">
            Tick each keyword already in your resume. Keywords tied to missing
            or required skills are flagged as priorities to add.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-bold tracking-tight ${coverageTone}`}>
            {coverage}%
          </p>
          <p className="text-xs text-slate-500">
            {coveredCount}/{total} covered
          </p>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${barTone}`}
          style={{ width: `${coverage}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
        >
          Mark all as covered
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => copyText(allKeywords.join(", "))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
        >
          Copy all keywords
        </button>
        <button
          type="button"
          onClick={() => copyText(gapKeywords.join(", "))}
          disabled={gapKeywords.length === 0}
          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          Copy keywords to add ({gapKeywords.length})
        </button>
        {copyLabel ? (
          <span className="inline-flex items-center text-xs font-medium text-slate-500">
            {copyLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {GROUP_LABELS.map((group) => {
          const values = unique(groups[group.key]);
          if (values.length === 0) return null;

          return (
            <div
              key={group.key}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {group.label}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {values.map((keyword, index) => {
                  const key = normalizeKey(keyword);
                  const isIncluded = included.has(key);
                  const isPriority =
                    missingKeySet.has(key) || requiredKeySet.has(key);

                  const toneClass = isIncluded
                    ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                    : isPriority
                      ? "border-rose-300 bg-rose-50 text-rose-800"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400";

                  return (
                    <button
                      key={`${group.key}-${keyword}-${index}`}
                      type="button"
                      onClick={() => toggle(keyword)}
                      aria-pressed={isIncluded}
                      title={
                        isPriority
                          ? "Priority: tied to a required or missing skill"
                          : undefined
                      }
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${toneClass}`}
                    >
                      <span
                        aria-hidden="true"
                        className={
                          isIncluded ? "text-emerald-600" : "text-slate-400"
                        }
                      >
                        {isIncluded ? "✓" : "+"}
                      </span>
                      {keyword}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Coverage is tracked in your browser for this view only and is not saved.
      </p>
    </section>
  );
}
