import { Skeleton } from "@/components/ui/skeleton";

export default function QueueLoading() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-14 w-14 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-6 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  );
}
