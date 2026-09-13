import { redirect } from "next/navigation";
import EmptyState from "@/components/ui/empty-state";
import QueueList, { type QueueItem } from "@/components/queue/queue-list";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

type DiscoveredJobRow = {
  id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  url: string | null;
  fit_score: number | null;
  match_label: string | null;
  status: string;
  analysis: unknown;
};

function skillsFrom(analysis: unknown, key: string): string[] {
  if (!analysis || typeof analysis !== "object") return [];
  const value = (analysis as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function QueuePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovered_jobs")
    .select(
      "id,title,company,location,url,fit_score,match_label,status,analysis",
    )
    .eq("user_id", user.id)
    .in("status", ["analyzed", "queued"])
    .order("fit_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-lg font-semibold text-rose-900">Review queue</h3>
        <p className="mt-2 text-sm text-rose-700">
          We could not load your queue right now. Please try again.
        </p>
      </section>
    );
  }

  const rows = (data ?? []) as DiscoveredJobRow[];

  const items: QueueItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title ?? "",
    company: row.company ?? "",
    location: row.location ?? "",
    url: row.url ?? "",
    fitScore: typeof row.fit_score === "number" ? row.fit_score : null,
    matchLabel: row.match_label ?? "",
    status: row.status,
    matchedSkills: skillsFrom(row.analysis, "matchedSkills"),
    missingSkills: skillsFrom(row.analysis, "missingSkills"),
  }));

  const readyCount = items.filter((item) => item.status === "queued").length;

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-slate-950">
          Review queue
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Discovered jobs scored against your profile, best matches first.
          {items.length > 0
            ? ` ${items.length} to review${readyCount > 0 ? `, ${readyCount} marked ready` : ""}.`
            : ""}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Nothing in the queue yet"
          description="Once discovery runs and scores jobs above your minimum fit, they'll show up here to review. Add a source and search rule to get started."
          actionHref="/dashboard/search"
          actionLabel="Set up Search & Sources"
        />
      ) : (
        <QueueList items={items} />
      )}
    </section>
  );
}
