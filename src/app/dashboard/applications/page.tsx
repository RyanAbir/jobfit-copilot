import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

type JobListItem = {
  id: string;
  job_title: string | null;
  company_name: string | null;
  created_at: string;
};

type JobAnalysisListItem = {
  job_id: string;
  fit_score: number;
  match_label: string | null;
};

type GeneratedApplicationListItem = {
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

export default async function ApplicationsPage() {
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
        <h3 className="text-lg font-semibold text-rose-900">Applications</h3>
        <p className="mt-2 text-sm text-rose-700">
          We could not load your saved applications right now. Please try again.
        </p>
      </section>
    );
  }

  const jobs = (jobsData ?? []) as JobListItem[];
  const jobIds = jobs.map((job) => job.id);

  const analysisByJobId = new Map<string, JobAnalysisListItem>();
  const generatedByJobId = new Map<string, GeneratedApplicationListItem>();

  if (jobIds.length > 0) {
    const { data: analysisData } = await supabase
      .from("job_analysis")
      .select("job_id,fit_score,match_label")
      .in("job_id", jobIds);

    (analysisData ?? []).forEach((item) => {
      const typedItem = item as JobAnalysisListItem;
      analysisByJobId.set(typedItem.job_id, typedItem);
    });

    const { data: generatedData } = await supabase
      .from("generated_applications")
      .select("job_id,status")
      .in("job_id", jobIds);

    (generatedData ?? []).forEach((item) => {
      const typedItem = item as GeneratedApplicationListItem;
      generatedByJobId.set(typedItem.job_id, typedItem);
    });
  }

  if (jobs.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h3 className="text-lg font-semibold text-slate-900">Applications</h3>
        <p className="mt-2 text-sm text-slate-600">
          No saved applications yet. Analyze a job to create your first saved
          application.
        </p>
        <Link
          href="/dashboard/analyze"
          className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          Analyze a job
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-slate-950">
          Saved Applications
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Review your saved analyses and open details for each job.
        </p>
      </div>

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
                  Match
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Score
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
              {jobs.map((job) => {
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
                      {analysis?.match_label || "Not scored"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {typeof analysis?.fit_score === "number"
                        ? `${analysis.fit_score}/100`
                        : "N/A"}
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
  );
}
