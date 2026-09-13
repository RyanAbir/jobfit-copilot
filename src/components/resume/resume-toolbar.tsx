import Link from "next/link";
import PrintButton from "@/components/resume/print-button";

type ResumeToolbarProps = {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
};

export default function ResumeToolbar({
  backHref,
  backLabel,
  title,
  subtitle,
}: ResumeToolbarProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div>
        <Link
          href={backHref}
          className="text-sm font-semibold text-blue-700 underline-offset-4 hover:underline"
        >
          ← {backLabel}
        </Link>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>
      <PrintButton />
    </div>
  );
}
