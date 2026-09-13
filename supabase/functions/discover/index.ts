// JobFit Copilot — discovery Edge Function (Phase 1.3)
//
// Fetches jobs from each active Greenhouse job source, applies the owner's
// active search rule as a cheap filter, dedupes, and inserts new rows into
// `discovered_jobs` with status='new'. Analysis (fit scoring) is done
// separately by the /api/analyze-discovered route.
//
// Deploy:  supabase functions deploy discover --no-verify-jwt
// Secret:  supabase secrets set FUNCTION_SECRET=<random>
// Invoke:  POST https://<ref>.functions.supabase.co/discover  with header
//          x-function-secret: <random>
//
// Runs on Deno (Supabase Edge runtime), not Node — excluded from the Next build.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SearchRule = {
  id: string;
  titles: string[] | null;
  locations: string[] | null;
  must_have_keywords: string[] | null;
  exclude_keywords: string[] | null;
  company_blocklist: string[] | null;
};

type JobSource = {
  id: string;
  user_id: string;
  type: string;
  config: { board_token?: string } | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FUNCTION_SECRET = Deno.env.get("FUNCTION_SECRET") ?? "";

function lower(values: string[] | null | undefined): string[] {
  return (values ?? [])
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function decodeHtml(raw: string): string {
  const decoded = raw
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
  return decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function passesRule(
  rule: SearchRule | null,
  title: string,
  location: string,
  content: string,
  token: string,
): boolean {
  if (!rule) return true;

  const titleText = title.toLowerCase();
  const locationText = location.toLowerCase();
  const fullText = `${title}\n${content}`.toLowerCase();

  const titles = lower(rule.titles);
  if (titles.length > 0 && !titles.some((k) => titleText.includes(k))) {
    return false;
  }

  const locations = lower(rule.locations);
  if (
    locations.length > 0 &&
    !locations.some((k) => locationText.includes(k) || fullText.includes(k))
  ) {
    return false;
  }

  const excludes = lower(rule.exclude_keywords);
  if (excludes.some((k) => fullText.includes(k))) return false;

  const musts = lower(rule.must_have_keywords);
  if (musts.length > 0 && !musts.every((k) => fullText.includes(k))) {
    return false;
  }

  const blocklist = lower(rule.company_blocklist);
  if (blocklist.some((b) => token.toLowerCase().includes(b))) return false;

  return true;
}

Deno.serve(async (req: Request) => {
  if (FUNCTION_SECRET && req.headers.get("x-function-secret") !== FUNCTION_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sources } = await supabase
    .from("job_sources")
    .select("id,user_id,type,config")
    .eq("is_active", true)
    .eq("type", "greenhouse");

  let totalNew = 0;
  const perSource: Record<string, number> = {};

  for (const source of (sources ?? []) as JobSource[]) {
    const token = source.config?.board_token?.trim();
    if (!token) continue;

    const { data: rule } = await supabase
      .from("search_rules")
      .select(
        "id,titles,locations,must_have_keywords,exclude_keywords,company_blocklist",
      )
      .eq("user_id", source.user_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let jobs: Array<Record<string, unknown>> = [];
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`,
      );
      if (!res.ok) {
        await supabase.from("job_run_log").insert({
          user_id: source.user_id,
          run_type: "discovery",
          source: `greenhouse:${token}`,
          error_count: 1,
          details: { status: res.status },
        });
        continue;
      }
      const body = await res.json();
      jobs = Array.isArray(body?.jobs) ? body.jobs : [];
    } catch (error) {
      await supabase.from("job_run_log").insert({
        user_id: source.user_id,
        run_type: "discovery",
        source: `greenhouse:${token}`,
        error_count: 1,
        details: { error: String(error) },
      });
      continue;
    }

    const rows: Array<Record<string, unknown>> = [];
    for (const job of jobs) {
      const title = String(job.title ?? "");
      const locationName =
        (job.location as { name?: string } | undefined)?.name ?? "";
      const content = decodeHtml(String(job.content ?? ""));

      if (!passesRule(rule as SearchRule | null, title, locationName, content, token)) {
        continue;
      }

      const dedupeHash = await sha256(`greenhouse:${token}:${job.id}`);
      rows.push({
        user_id: source.user_id,
        search_rule_id: (rule as SearchRule | null)?.id ?? null,
        source: "greenhouse",
        source_job_id: String(job.id ?? ""),
        dedupe_hash: dedupeHash,
        title,
        company: token,
        location: locationName,
        url: (job.absolute_url as string | undefined) ?? null,
        description: content,
        raw_payload: job,
        apply_channel: "browser",
        status: "new",
      });
    }

    let insertedCount = 0;
    if (rows.length > 0) {
      const { data: inserted } = await supabase
        .from("discovered_jobs")
        .upsert(rows, {
          onConflict: "user_id,dedupe_hash",
          ignoreDuplicates: true,
        })
        .select("id");
      insertedCount = inserted?.length ?? 0;
    }

    totalNew += insertedCount;
    perSource[token] = insertedCount;

    await supabase
      .from("job_sources")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", source.id);

    await supabase.from("job_run_log").insert({
      user_id: source.user_id,
      run_type: "discovery",
      source: `greenhouse:${token}`,
      discovered_count: insertedCount,
      details: { fetched: jobs.length, matched_new: insertedCount },
    });
  }

  return new Response(JSON.stringify({ ok: true, totalNew, perSource }), {
    headers: { "content-type": "application/json" },
  });
});
