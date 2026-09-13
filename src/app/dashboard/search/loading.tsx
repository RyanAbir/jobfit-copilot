import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-11 w-full rounded-xl" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}
