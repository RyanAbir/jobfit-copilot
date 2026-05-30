import "server-only";

import { createGeminiClient, getGeminiModelName } from "@/lib/ai/gemini";
import type {
  CandidateProfileForAnalysis,
  JobAnalysisInput,
  JobFitAnalysis,
  MatchLabel,
  ResumeKeywordSuggestions,
  ScoreBreakdown,
} from "@/lib/ai/types";

export class MissingGeminiApiKeyError extends Error {
  constructor() {
    super(
      "GEMINI_API_KEY is not configured. Please add it to your server environment and try again.",
    );
    this.name = "MissingGeminiApiKeyError";
  }
}

export class InvalidAiJsonError extends Error {
  constructor() {
    super("The AI response could not be processed. Please try again.");
    this.name = "InvalidAiJsonError";
  }
}

const systemInstruction = `
You are JobFit Copilot, an honest job application assistant for full-stack developers.

Rules:
- Return valid JSON only.
- Do not include markdown.
- Do not include text outside JSON.
- Do not invent candidate experience.
- Do not claim skills not present in profile fields.
- Missing skills must be explicit and honest.
- Do not encourage auto-apply, spam, scraping, or mass-application behavior.
- Keep outputs practical, concise, and ethical.
- Use the exact schema requested.
`.trim();

function buildUserPrompt(
  profile: CandidateProfileForAnalysis,
  jobInput: JobAnalysisInput,
): string {
  return `
Analyze this job post against the candidate profile.

Candidate Profile JSON:
${JSON.stringify(profile)}

Job Metadata JSON:
${JSON.stringify({
    companyName: jobInput.companyName,
    jobTitle: jobInput.jobTitle,
    sourceUrl: jobInput.sourceUrl,
    workType: jobInput.workType,
    salaryRange: jobInput.salaryRange,
  })}

Job Post Text:
${jobInput.jobPostText}

Return strict JSON with this exact shape and keys:
{
  "jobTitle": "string",
  "companyName": "string",
  "requiredSkills": ["string"],
  "niceToHaveSkills": ["string"],
  "responsibilities": ["string"],
  "experienceLevel": "string",
  "workType": "string",
  "location": "string",
  "redFlags": ["string"],
  "matchedSkills": ["string"],
  "partiallyMatchedSkills": ["string"],
  "missingSkills": ["string"],
  "relevantProjects": ["string"],
  "weakAreas": ["string"],
  "resumeKeywordSuggestions": {
    "frontend": ["string"],
    "backend": ["string"],
    "database": ["string"],
    "authentication": ["string"],
    "payment": ["string"],
    "deployment": ["string"],
    "testing": ["string"],
    "softSkills": ["string"]
  },
  "generatedEmailSubject": "string",
  "generatedApplicationEmail": "string",
  "interviewPreparationQuestions": ["string"],
  "scoreBreakdown": {
    "technicalSkillMatch": 0,
    "projectRelevance": 0,
    "experienceMatch": 0,
    "locationWorkModeMatch": 0,
    "resumeKeywordMatch": 0
  },
  "finalScore": 0,
  "matchLabel": "Strong Match | Good Match | Partial Match | Weak Match",
  "scoreExplanation": "string"
}

Score rules:
- technicalSkillMatch: 0-40
- projectRelevance: 0-25
- experienceMatch: 0-15
- locationWorkModeMatch: 0-10
- resumeKeywordMatch: 0-10
- finalScore: 0-100

Match labels:
- 80-100 => Strong Match
- 60-79 => Good Match
- 40-59 => Partial Match
- 0-39 => Weak Match
`.trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeMatchLabel(score: number, label: unknown): MatchLabel {
  if (
    label === "Strong Match" ||
    label === "Good Match" ||
    label === "Partial Match" ||
    label === "Weak Match"
  ) {
    return label;
  }

  if (score >= 80) {
    return "Strong Match";
  }

  if (score >= 60) {
    return "Good Match";
  }

  if (score >= 40) {
    return "Partial Match";
  }

  return "Weak Match";
}

function parseResumeKeywords(value: unknown): ResumeKeywordSuggestions {
  const obj = asRecord(value);

  return {
    frontend: asStringArray(obj?.frontend),
    backend: asStringArray(obj?.backend),
    database: asStringArray(obj?.database),
    authentication: asStringArray(obj?.authentication),
    payment: asStringArray(obj?.payment),
    deployment: asStringArray(obj?.deployment),
    testing: asStringArray(obj?.testing),
    softSkills: asStringArray(obj?.softSkills),
  };
}

function parseScoreBreakdown(value: unknown): ScoreBreakdown {
  const obj = asRecord(value);

  return {
    technicalSkillMatch: clamp(asNumber(obj?.technicalSkillMatch), 0, 40),
    projectRelevance: clamp(asNumber(obj?.projectRelevance), 0, 25),
    experienceMatch: clamp(asNumber(obj?.experienceMatch), 0, 15),
    locationWorkModeMatch: clamp(
      asNumber(obj?.locationWorkModeMatch, asNumber(obj?.locationMatch)),
      0,
      10,
    ),
    resumeKeywordMatch: clamp(asNumber(obj?.resumeKeywordMatch), 0, 10),
  };
}

function parseAndValidateAnalysis(rawText: string): JobFitAnalysis {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new InvalidAiJsonError();
  }

  const obj = asRecord(parsed);
  if (!obj) {
    throw new InvalidAiJsonError();
  }

  const scoreBreakdown = parseScoreBreakdown(obj.scoreBreakdown);
  const computedFinalScore = clamp(
    scoreBreakdown.technicalSkillMatch +
      scoreBreakdown.projectRelevance +
      scoreBreakdown.experienceMatch +
      scoreBreakdown.locationWorkModeMatch +
      scoreBreakdown.resumeKeywordMatch,
    0,
    100,
  );

  const coverLetter = asRecord(obj.coverLetter);
  const finalScore = clamp(asNumber(obj.finalScore, computedFinalScore), 0, 100);

  return {
    jobTitle: asString(obj.jobTitle, "Not specified"),
    companyName: asString(obj.companyName, "Not specified"),
    requiredSkills: asStringArray(obj.requiredSkills),
    niceToHaveSkills: asStringArray(obj.niceToHaveSkills),
    responsibilities: asStringArray(obj.responsibilities),
    experienceLevel: asString(obj.experienceLevel, "Not specified"),
    workType: asString(obj.workType, asString(obj.extractedWorkType, "Not specified")),
    location: asString(obj.location, asString(obj.extractedLocation, "Not specified")),
    redFlags: asStringArray(obj.redFlags),
    matchedSkills: asStringArray(obj.matchedSkills),
    partiallyMatchedSkills: asStringArray(obj.partiallyMatchedSkills),
    missingSkills: asStringArray(obj.missingSkills),
    relevantProjects: asStringArray(obj.relevantProjects),
    weakAreas: asStringArray(obj.weakAreas),
    resumeKeywordSuggestions: parseResumeKeywords(obj.resumeKeywordSuggestions),
    generatedEmailSubject: asString(
      obj.generatedEmailSubject,
      asString(coverLetter?.subject, "Application for this role"),
    ),
    generatedApplicationEmail: asString(
      obj.generatedApplicationEmail,
      asString(coverLetter?.body),
    ),
    interviewPreparationQuestions: asStringArray(obj.interviewPreparationQuestions),
    scoreBreakdown,
    finalScore,
    matchLabel: normalizeMatchLabel(finalScore, obj.matchLabel),
    scoreExplanation: asString(obj.scoreExplanation),
  };
}

export async function analyzeJobWithGemini(
  profile: CandidateProfileForAnalysis,
  jobInput: JobAnalysisInput,
): Promise<JobFitAnalysis> {
  let client;

  try {
    client = createGeminiClient();
  } catch (error) {
    if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
      throw new MissingGeminiApiKeyError();
    }
    throw error;
  }

  const response = await client.models.generateContent({
    model: getGeminiModelName(),
    contents: buildUserPrompt(profile, jobInput),
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  });

  const rawText = response.text?.trim();

  if (!rawText) {
    throw new InvalidAiJsonError();
  }

  return parseAndValidateAnalysis(rawText);
}
