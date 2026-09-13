export type SearchRuleValues = {
  id: string | null;
  name: string;
  titles: string; // comma-separated in the form
  locations: string;
  workTypes: string[]; // subset of WORK_TYPE_OPTIONS
  seniority: string;
  minSalary: string; // numeric string, may be empty
  mustHaveKeywords: string;
  excludeKeywords: string;
  minFitScore: number;
  dailyCap: number;
  companyBlocklist: string;
  autoApply: boolean;
};

export type ActionResult = { ok: boolean; error?: string };

export const WORK_TYPE_OPTIONS = ["Remote", "Hybrid", "On-site"] as const;

export const emptySearchRule: SearchRuleValues = {
  id: null,
  name: "My search",
  titles: "",
  locations: "",
  workTypes: [],
  seniority: "",
  minSalary: "",
  mustHaveKeywords: "",
  excludeKeywords: "",
  minFitScore: 70,
  dailyCap: 10,
  companyBlocklist: "",
  autoApply: false,
};

export type JobSourceItem = {
  id: string;
  type: string;
  boardToken: string;
  label: string;
  isActive: boolean;
};
