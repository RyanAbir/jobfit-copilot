import { redirect } from "next/navigation";
import AnalyzeForm from "@/components/analyze/analyze-form";
import {
  extractJobDetailsAction,
  submitAnalyzeFormAction,
} from "@/app/dashboard/analyze/actions";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export default async function AnalyzePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasProfile = Boolean(profile);

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-slate-950">
          Analyze Job
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Paste a job post to get a structured fit analysis based on your
          profile, including score, skill gaps, red flags, resume keywords, and
          a tailored application email.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-6">
        <AnalyzeForm
          hasProfile={hasProfile}
          action={submitAnalyzeFormAction}
          extractionAction={extractJobDetailsAction}
        />
      </div>
    </section>
  );
}
