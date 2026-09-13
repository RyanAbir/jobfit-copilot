import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyzeLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-11 w-full rounded-xl" />
        <Skeleton className="mt-3 h-28 w-full rounded-xl" />
        <Skeleton className="mt-3 h-10 w-40 rounded-xl" />
      </div>
    </section>
  );
}
