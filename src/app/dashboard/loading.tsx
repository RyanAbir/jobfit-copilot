import { Skeleton, SkeletonCard, SkeletonRows } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </section>
      <section className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <SkeletonRows rows={5} />
      </section>
    </div>
  );
}
