import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeJobWithGemini } from "@/lib/ai/job-analysis";
import type { CandidateProfileForAnalysis } from "@/lib/ai/types";

// One job per invocation keeps us well within serverless time limits.
export const maxDuration = 60;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  let discoveredJobId: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.discoveredJobId === "string") {
      discoveredJobId = body.discoveredJobId;
    }
  } catch {
    // No body / not JSON — fall back to sweeping the oldest new job.
  }

  const selection =
    "id,user_id,title,company,location,url,description";
  const { data: jobRows } = discoveredJobId
    ? await supabase
        .from("discovered_jobs")
        .select(selection)
        .eq("id", discoveredJobId)
        .limit(1)
    : await supabase
        .from("discovered_jobs")
        .select(selection)
        .eq("status", "new")
        .order("created_at", { ascending: true })
        .limit(1);

  const job = jobRows?.[0];
  if (!job) {
    return NextResponse.json({ ok: true, analyzed: 0 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name,target_role,location,experience_level,skills,main_tech_stack,projects,experience_summary,resume_text,portfolio_url,github_url,linkedin_url",
    )
    .eq("user_id", job.user_id)
    .maybeSingle();

  if (!profile) {
    await supabase
      .from("discovered_jobs")
      .update({ status: "needs_human" })
      .eq("id", job.id);
    return NextResponse.json({ ok: true, analyzed: 0, reason: "no_profile" });
  }

  const candidate: CandidateProfileForAnalysis = {
    fullName: str(profile.full_name),
    targetRole: str(profile.target_role),
    location: str(profile.location),
    experienceLevel: str(profile.experience_level),
    skills: strArray(profile.skills),
    mainTechStack: strArray(profile.main_tech_stack),
    projects: str(profile.projects),
    experienceSummary: str(profile.experience_summary),
    resumeText: str(profile.resume_text),
    portfolioUrl: str(profile.portfolio_url),
    githubUrl: str(profile.github_url),
    linkedinUrl: str(profile.linkedin_url),
  };

  const { data: rule } = await supabase
    .from("search_rules")
    .select("min_fit_score")
    .eq("user_id", job.user_id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const minFit =
    typeof rule?.min_fit_score === "number" ? rule.min_fit_score : 70;

  try {
    const { analysis } = await analyzeJobWithGemini(candidate, {
      companyName: str(job.company),
      jobTitle: str(job.title),
      sourceUrl: str(job.url),
      workType: "",
      salaryRange: "",
      jobPostText: str(job.description) || str(job.title),
    });

    const status = analysis.finalScore >= minFit ? "analyzed" : "filtered_out";

    await supabase
      .from("discovered_jobs")
      .update({
        fit_score: analysis.finalScore,
        match_label: analysis.matchLabel,
        analysis,
        status,
      })
      .eq("id", job.id);

    return NextResponse.json({
      ok: true,
      analyzed: 1,
      jobId: job.id,
      fitScore: analysis.finalScore,
      status,
    });
  } catch {
    // Move it out of the 'new' queue so a persistent failure never blocks
    // the head of the line; it surfaces for manual review instead.
    await supabase
      .from("discovered_jobs")
      .update({ status: "needs_human" })
      .eq("id", job.id);
    return NextResponse.json({ ok: false, error: "analysis_failed" });
  }
}
