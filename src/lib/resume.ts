export type ProfileRecord = {
  full_name: string | null;
  target_role: string | null;
  location: string | null;
  experience_level: string | null;
  skills: string[] | null;
  main_tech_stack: string[] | null;
  projects: string | null;
  experience_summary: string | null;
  resume_text: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
};

export type ResumeContactLink = {
  label: string;
  value: string;
  href?: string;
};

export type ResumeData = {
  name: string;
  role: string;
  location: string;
  experienceLevel: string;
  contacts: ResumeContactLink[];
  summary: string;
  skills: string[];
  highlightedSkills: string[];
  recommendedKeywords: string[];
  projects: string;
  experienceDetail: string;
  tailoredFor?: {
    jobTitle: string;
    companyName: string;
  };
};

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function cleanArray(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = clean(value);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function normalizeUrl(value: string): { display: string; href: string } {
  const trimmed = value.trim();
  const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const display = trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return { display, href };
}

function buildContacts(
  profile: ProfileRecord,
  email: string,
): ResumeContactLink[] {
  const contacts: ResumeContactLink[] = [];
  const trimmedEmail = clean(email);
  if (trimmedEmail) {
    contacts.push({
      label: "Email",
      value: trimmedEmail,
      href: `mailto:${trimmedEmail}`,
    });
  }

  const location = clean(profile.location);
  if (location) {
    contacts.push({ label: "Location", value: location });
  }

  const urlFields: { label: string; raw: string | null }[] = [
    { label: "Portfolio", raw: profile.portfolio_url },
    { label: "GitHub", raw: profile.github_url },
    { label: "LinkedIn", raw: profile.linkedin_url },
  ];

  for (const field of urlFields) {
    const raw = clean(field.raw);
    if (!raw) continue;
    const { display, href } = normalizeUrl(raw);
    contacts.push({ label: field.label, value: display, href });
  }

  return contacts;
}

function buildBaseSummary(profile: ProfileRecord): string {
  const existing = clean(profile.experience_summary);
  if (existing) return existing;

  const role = clean(profile.target_role) || "Developer";
  const level = clean(profile.experience_level);
  const levelPart = level ? `${level} ` : "";
  return `${levelPart}${role} focused on building reliable, well-structured web applications.`;
}

/**
 * Orders `skills` so that any that appear in `priority` come first (keeping
 * their profile order), followed by the remaining skills.
 */
function orderByPriority(skills: string[], priority: string[]): string[] {
  const prioritySet = new Set(priority.map((item) => item.toLowerCase()));
  const matched = skills.filter((skill) => prioritySet.has(skill.toLowerCase()));
  const rest = skills.filter((skill) => !prioritySet.has(skill.toLowerCase()));
  return [...matched, ...rest];
}

export function buildResumeData(
  profile: ProfileRecord,
  email: string,
): ResumeData {
  const skills = cleanArray(profile.skills);
  const stack = cleanArray(profile.main_tech_stack);
  const mergedSkills = cleanArray([...skills, ...stack]);

  return {
    name: clean(profile.full_name) || "Your Name",
    role: clean(profile.target_role) || "Developer",
    location: clean(profile.location),
    experienceLevel: clean(profile.experience_level),
    contacts: buildContacts(profile, email),
    summary: buildBaseSummary(profile),
    skills: mergedSkills,
    highlightedSkills: [],
    recommendedKeywords: [],
    projects: clean(profile.projects),
    experienceDetail: clean(profile.resume_text),
  };
}

export type TailoringInput = {
  jobTitle: string;
  companyName: string;
  matchedSkills: string[];
  partiallyMatchedSkills: string[];
  recommendedKeywords: string[];
};

export function buildTailoredResumeData(
  profile: ProfileRecord,
  email: string,
  tailoring: TailoringInput,
): ResumeData {
  const base = buildResumeData(profile, email);

  const matched = cleanArray(tailoring.matchedSkills);
  const partial = cleanArray(tailoring.partiallyMatchedSkills);
  const priority = [...matched, ...partial];

  const highlightedSkills = matched.filter((skill) =>
    base.skills.some((existing) => existing.toLowerCase() === skill.toLowerCase()),
  );

  const jobTitle = clean(tailoring.jobTitle);
  const companyName = clean(tailoring.companyName);

  const focusLine =
    highlightedSkills.length > 0
      ? ` Strengths for this role include ${highlightedSkills.slice(0, 6).join(", ")}.`
      : "";
  const targetLine = jobTitle
    ? ` Tailored for the ${jobTitle}${companyName ? ` role at ${companyName}` : " role"}.`
    : "";

  return {
    ...base,
    summary: `${base.summary}${targetLine}${focusLine}`.trim(),
    skills: orderByPriority(base.skills, priority),
    highlightedSkills,
    recommendedKeywords: cleanArray(tailoring.recommendedKeywords),
    tailoredFor:
      jobTitle || companyName
        ? { jobTitle: jobTitle || "Role", companyName }
        : undefined,
  };
}

export function keywordsFromRawResponse(rawAiResponse: unknown): string[] {
  if (!rawAiResponse || typeof rawAiResponse !== "object") return [];
  const record = rawAiResponse as Record<string, unknown>;
  const suggestions = record.resumeKeywordSuggestions;
  if (!suggestions || typeof suggestions !== "object") return [];

  const groups = suggestions as Record<string, unknown>;
  const flat: string[] = [];
  for (const value of Object.values(groups)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") flat.push(item);
      }
    }
  }
  return cleanArray(flat);
}
