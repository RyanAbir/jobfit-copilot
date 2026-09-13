import Link from "next/link";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: ReactNode;
  className?: string;
};

export default function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <section
      className={`rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center sm:p-8 ${className}`}
    >
      {icon ? (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          {description}
        </p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
