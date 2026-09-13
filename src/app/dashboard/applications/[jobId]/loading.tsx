import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function ApplicationDetailLoading() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-28" />
      </div>
    </section>
  );
}
