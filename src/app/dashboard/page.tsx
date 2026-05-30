import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

type JobRow = {
  id: string;
  job_title: string | null;
  company_name: string | null;
  created_at: string;
};

type JobAnalysisRow = {
  job_id: string;
  fit_score: number;
  match_label: string | null;
};

type GeneratedApplicationRow = {
  job_id: string;
  status: string;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();
  const { data: jobsData, error: jobsError } = await supabase
    .from("jobs")
    .select("id,job_title,company_name,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (jobsError) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-lg font-semibold text-rose-900">Dashboard</h3>
        <p className="mt-2 text-sm text-rose-700">
          We could not load your dashboard data right now. Please try again.
        </p>
      </section>
    );
  }

  const jobs = (jobsData ?? []) as JobRow[];
  const jobIds = jobs.map((job) => job.id);

  const analysisByJobId = new Map<string, JobAnalysisRow>();
  const generatedByJobId = new Map<string, GeneratedApplicationRow>();

  if (jobIds.length > 0) {
    const { data: analysisData } = await supabase
      .from("job_analysis")
      .select("job_id,fit_score,match_label")
      .in("job_id", jobIds);

    (analysisData ?? []).forEach((item) => {
      const typedItem = item as JobAnalysisRow;
      analysisByJobId.set(typedItem.job_id, typedItem);
    });

    const { data: generatedData } = await supabase
      .from("generated_applications")
      .select("job_id,status")
      .in("job_id", jobIds);

    (generatedData ?? []).forEach((item) => {
      const typedItem = item as GeneratedApplicationRow;
      generatedByJobId.set(typedItem.job_id, typedItem);
    });
  }

  const totalJobsAnalyzed = jobs.length;
  const strongMatches = jobs.reduce((count, job) => {
    const analysis = analysisByJobId.get(job.id);
    if (!analysis) {
      return count;
    }

    if (analysis.fit_score >= 80 || analysis.match_label === "Strong Match") {
      return count + 1;
    }

    return count;
  }, 0);

  const draftApplications = jobs.reduce((count, job) => {
    const generated = generatedByJobId.get(job.id);
    if ((generated?.status ?? "Draft") === "Draft") {
      return count + 1;
    }

    return count;
  }, 0);

  const appliedJobs = jobs.reduce((count, job) => {
    const generated = generatedByJobId.get(job.id);
    if (generated?.status === "Applied") {
      return count + 1;
    }

    return count;
  }, 0);

  const dashboardCards = [
    { label: "Total jobs analyzed", value: totalJobsAnalyzed },
    { label: "Strong matches", value: strongMatches },
    { label: "Draft applications", value: draftApplications },
    { label: "Applied jobs", value: appliedJobs },
  ];

  const recentJobs = jobs.slice(0, 5);

  return (
    <main className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        {dashboardCards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5"
          >
            <p className="text-sm font-medium text-slate-600">{card.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {card.value}
            </p>
          </article>
        ))}
      </section>

      {recentJobs.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Recent applications
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            No applications analyzed yet. Start by analyzing your first job.
          </p>
          <Link
            href="/dashboard/analyze"
            className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Analyze a job
          </Link>
        </section>
      ) : (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Recent applications
          </h3>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Job title
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Score
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Match
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {recentJobs.map((job) => {
                    const analysis = analysisByJobId.get(job.id);
                    const generated = generatedByJobId.get(job.id);

                    return (
                      <tr key={job.id}>
                        <td className="px-4 py-3 text-slate-900">
                          {job.job_title || "Untitled role"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {job.company_name || "Not specified"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {typeof analysis?.fit_score === "number"
                            ? `${analysis.fit_score}/100`
                            : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {analysis?.match_label || "Not scored"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {generated?.status || "Draft"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDate(job.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/applications/${job.id}`}
                            className="font-semibold text-blue-700 hover:text-blue-800"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
