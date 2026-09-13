import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";

export default function ApplicationsLoading() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <SkeletonRows rows={6} />
    </section>
  );
}
