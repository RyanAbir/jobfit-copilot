import { redirect } from "next/navigation";
import SearchRulesForm from "@/components/search/search-rules-form";
import SourcesEditor from "@/components/search/sources-editor";
import {
  emptySearchRule,
  type JobSourceItem,
  type SearchRuleValues,
} from "@/app/dashboard/search/search-state";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

type SearchRuleRow = {
  id: string;
  name: string | null;
  titles: string[] | null;
  locations: string[] | null;
  work_types: string[] | null;
  seniority: string[] | null;
  min_salary: number | null;
  must_have_keywords: string[] | null;
  exclude_keywords: string[] | null;
  min_fit_score: number | null;
  daily_cap: number | null;
  company_blocklist: string[] | null;
  auto_apply: boolean | null;
};

type JobSourceRow = {
  id: string;
  type: string;
  config: { board_token?: string } | null;
  label: string | null;
  is_active: boolean | null;
};

function joinList(value: string[] | null | undefined): string {
  return Array.isArray(value) ? value.join(", ") : "";
}

export default async function SearchSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  const [{ data: ruleData }, { data: sourceData }] = await Promise.all([
    supabase
      .from("search_rules")
      .select(
        "id,name,titles,locations,work_types,seniority,min_salary,must_have_keywords,exclude_keywords,min_fit_score,daily_cap,company_blocklist,auto_apply",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("job_sources")
      .select("id,type,config,label,is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const rule = (ruleData ?? null) as SearchRuleRow | null;

  const initialValues: SearchRuleValues = rule
    ? {
        id: rule.id,
        name: rule.name ?? "My search",
        titles: joinList(rule.titles),
        locations: joinList(rule.locations),
        workTypes: Array.isArray(rule.work_types) ? rule.work_types : [],
        seniority: joinList(rule.seniority),
        minSalary:
          typeof rule.min_salary === "number" ? String(rule.min_salary) : "",
        mustHaveKeywords: joinList(rule.must_have_keywords),
        excludeKeywords: joinList(rule.exclude_keywords),
        minFitScore:
          typeof rule.min_fit_score === "number" ? rule.min_fit_score : 70,
        dailyCap: typeof rule.daily_cap === "number" ? rule.daily_cap : 10,
        companyBlocklist: joinList(rule.company_blocklist),
        autoApply: Boolean(rule.auto_apply),
      }
    : emptySearchRule;

  const sources: JobSourceItem[] = ((sourceData ?? []) as JobSourceRow[]).map(
    (row) => ({
      id: row.id,
      type: row.type,
      boardToken: row.config?.board_token ?? "",
      label: row.label ?? "",
      isActive: Boolean(row.is_active),
    }),
  );

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-slate-950">
          Search & Sources
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Configure where jobs come from and how JobFit decides which ones are
          worth surfacing. Discovery uses these settings.
        </p>
      </div>

      <SourcesEditor sources={sources} />
      <SearchRulesForm initialValues={initialValues} />
    </section>
  );
}
