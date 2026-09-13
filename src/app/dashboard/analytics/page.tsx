import { redirect } from "next/navigation";
import EmptyState from "@/components/ui/empty-state";
import {
  ColumnChart,
  HorizontalBars,
  type BarDatum,
} from "@/components/analytics/charts";
import { APPLICATION_STATUSES } from "@/lib/application-status";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

type JobRow = { id: string; created_at: string };
type AnalysisRow = {
  job_id: string;
  fit_score: number | null;
  missing_skills: string[] | null;
};
type GeneratedRow = { job_id: string; status: string | null };

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function lastSixMonths(): { key: string; label: string }[] {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: monthKey(date),
      label: date.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  return months;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

const STATUS_TONES: Record<string, string> = {
  Draft: "bg-slate-400",
  Applied: "bg-blue-500",
  Interview: "bg-amber-500",
  Rejected: "bg-rose-500",
  Offer: "bg-emerald-500",
};

export default async function AnalyticsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();
  const { data: jobsData, error: jobsError } = await supabase
    .from("jobs")
    .select("id,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (jobsError) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-lg font-semibold text-rose-900">Analytics</h3>
        <p className="mt-2 text-sm text-rose-700">
          We could not load your analytics right now. Please try again.
        </p>
      </section>
    );
  }

  const jobs = (jobsData ?? []) as JobRow[];

  if (jobs.length === 0) {
    return (
      <section className="space-y-5">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-950">
            Analytics & Insights
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Trends across every job you analyze will appear here.
          </p>
        </div>
        <EmptyState
          title="No data to chart yet"
          description="Analyze your first job to start seeing fit-score trends, status breakdowns, and the skills that come up most often."
          actionHref="/dashboard/analyze"
          actionLabel="Analyze a job"
        />
      </section>
    );
  }

  const jobIds = jobs.map((job) => job.id);

  const { data: analysisData } = await supabase
    .from("job_analysis")
    .select("job_id,fit_score,missing_skills")
    .in("job_id", jobIds);
  const analysisRows = (analysisData ?? []) as AnalysisRow[];

  const { data: generatedData } = await supabase
    .from("generated_applications")
    .select("job_id,status")
    .in("job_id", jobIds);
  const generatedRows = (generatedData ?? []) as GeneratedRow[];

  // Applications analyzed per month (last 6 months).
  const months = lastSixMonths();
  const monthCounts = new Map<string, number>(months.map((m) => [m.key, 0]));
  for (const job of jobs) {
    const key = monthKey(new Date(job.created_at));
    if (monthCounts.has(key)) {
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    }
  }
  const overTime: BarDatum[] = months.map((m) => ({
    label: m.label,
    value: monthCounts.get(m.key) ?? 0,
  }));

  // Fit-score distribution.
  const buckets = [
    { label: "Strong (80-100)", min: 80, tone: "bg-emerald-500", value: 0 },
    { label: "Good (60-79)", min: 60, tone: "bg-blue-500", value: 0 },
    { label: "Partial (40-59)", min: 40, tone: "bg-amber-500", value: 0 },
    { label: "Weak (0-39)", min: 0, tone: "bg-rose-500", value: 0 },
  ];
  for (const row of analysisRows) {
    const score = typeof row.fit_score === "number" ? row.fit_score : 0;
    const bucket = buckets.find((b) => score >= b.min);
    if (bucket) bucket.value += 1;
  }
  const scoreDistribution: BarDatum[] = buckets.map((b) => ({
    label: b.label,
    value: b.value,
    tone: b.tone,
  }));

  // Status breakdown (jobs with no generated row count as Draft).
  const statusByJob = new Map<string, string>();
  for (const row of generatedRows) {
    statusByJob.set(row.job_id, row.status || "Draft");
  }
  const statusCounts = new Map<string, number>(
    APPLICATION_STATUSES.map((status) => [status, 0]),
  );
  for (const job of jobs) {
    const status = statusByJob.get(job.id) || "Draft";
    if (statusCounts.has(status)) {
      statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    }
  }
  const statusBreakdown: BarDatum[] = APPLICATION_STATUSES.map((status) => ({
    label: status,
    value: statusCounts.get(status) ?? 0,
    tone: STATUS_TONES[status] ?? "bg-blue-500",
  }));

  // Top recurring missing skills across all analyses.
  const missingCounts = new Map<string, { label: string; count: number }>();
  for (const row of analysisRows) {
    for (const skill of asStringArray(row.missing_skills)) {
      const key = skill.toLowerCase();
      const existing = missingCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        missingCounts.set(key, { label: skill, count: 1 });
      }
    }
  }
  const topMissingSkills: BarDatum[] = Array.from(missingCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((item) => ({ label: item.label, value: item.count, tone: "bg-rose-500" }));

  const scoredCount = analysisRows.length;
  const averageScore =
    scoredCount > 0
      ? Math.round(
          analysisRows.reduce(
            (sum, row) =>
              sum + (typeof row.fit_score === "number" ? row.fit_score : 0),
            0,
          ) / scoredCount,
        )
      : 0;

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-slate-950">
          Analytics & Insights
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Trends across all {jobs.length} analyzed{" "}
          {jobs.length === 1 ? "job" : "jobs"}. Average fit score:{" "}
          <span className="font-semibold text-slate-900">{averageScore}</span>/100.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h4 className="text-sm font-semibold text-slate-900">
            Jobs analyzed over time
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">Last 6 months</p>
          <div className="mt-4">
            <ColumnChart data={overTime} />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h4 className="text-sm font-semibold text-slate-900">
            Fit-score distribution
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            How your matches break down
          </p>
          <div className="mt-4">
            <HorizontalBars data={scoreDistribution} />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h4 className="text-sm font-semibold text-slate-900">
            Application status
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Where your applications stand
          </p>
          <div className="mt-4">
            <HorizontalBars data={statusBreakdown} />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h4 className="text-sm font-semibold text-slate-900">
            Top recurring missing skills
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Skills to consider learning next
          </p>
          <div className="mt-4">
            <HorizontalBars
              data={topMissingSkills}
              emptyLabel="No missing skills recorded yet."
            />
          </div>
        </article>
      </div>
    </section>
  );
}
