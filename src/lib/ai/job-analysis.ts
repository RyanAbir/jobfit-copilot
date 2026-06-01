import "server-only";

import { getAiErrorSummary } from "@/lib/ai/error-utils";
import {
  GeminiType,
  generateGeminiJson,
  getGeminiModelName,
  repairGeminiJson,
} from "@/lib/ai/gemini";
import type {
  CandidateProfileForAnalysis,
  JobAnalysisInput,
  JobFitAnalysis,
  MatchLabel,
  ResumeKeywordSuggestions,
  ScoreBreakdown,
} from "@/lib/ai/types";

export class InvalidAiJsonError extends Error {
  constructor() {
    super("The AI response could not be processed. Please try again.");
    this.name = "InvalidAiJsonError";
  }
}

export type AnalyzeJobProviderResult = {
  analysis: JobFitAnalysis;
  model: string;
  provider: "gemini";
};

class JsonParseFailureError extends InvalidAiJsonError {
  diagnostics: Record<string, unknown>;

  constructor(diagnostics: Record<string, unknown>) {
    super();
    this.name = "JsonParseFailureError";
    this.diagnostics = diagnostics;
  }
}

const systemInstruction = `
You are JobFit Copilot, an honest job application assistant for full-stack developers.

Rules:
- Return valid JSON only.
- No markdown.
- No comments.
- No prose outside JSON.
- Do not invent candidate experience.
- Do not claim skills not present in profile fields.
- Missing skills must be explicit and honest.
- Do not encourage auto-apply, spam, scraping, or mass-application behavior.
- Keep outputs practical, concise, and ethical.
- Use the exact schema requested.
- requiredSkills must contain at most 5 items.
- niceToHaveSkills must contain at most 5 items.
- responsibilities must contain at most 5 items.
- redFlags must contain at most 3 items.
- matchedSkills must contain at most 5 items.
- partiallyMatchedSkills must contain at most 5 items.
- missingSkills must contain at most 5 items.
- relevantProjects must contain at most 3 items.
- weakAreas must contain at most 3 items.
- interviewPreparationQuestions must contain at most 3 items.
- Each resumeKeywordSuggestions category must contain at most 3 items.
- generatedApplicationEmail must be under 120 words.
- scoreExplanation must be at most 2 sentences.
`.trim();

const requiredTopLevelKeys = [
  "jobTitle",
  "companyName",
  "requiredSkills",
  "niceToHaveSkills",
  "responsibilities",
  "experienceLevel",
  "workType",
  "location",
  "redFlags",
  "matchedSkills",
  "partiallyMatchedSkills",
  "missingSkills",
  "relevantProjects",
  "weakAreas",
  "resumeKeywordSuggestions",
  "generatedEmailSubject",
  "generatedApplicationEmail",
  "interviewPreparationQuestions",
  "scoreBreakdown",
  "finalScore",
  "matchLabel",
  "scoreExplanation",
] as const;

const analysisResponseSchema = {
  type: GeminiType.OBJECT,
  required: [...requiredTopLevelKeys],
  properties: {
    jobTitle: { type: GeminiType.STRING },
    companyName: { type: GeminiType.STRING },
    requiredSkills: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
    niceToHaveSkills: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
    responsibilities: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
    experienceLevel: { type: GeminiType.STRING },
    workType: { type: GeminiType.STRING },
    location: { type: GeminiType.STRING },
    redFlags: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
    matchedSkills: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
    partiallyMatchedSkills: {
      type: GeminiType.ARRAY,
      items: { type: GeminiType.STRING },
    },
    missingSkills: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
    relevantProjects: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
    weakAreas: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
    resumeKeywordSuggestions: {
      type: GeminiType.OBJECT,
      required: [
        "frontend",
        "backend",
        "database",
        "authentication",
        "payment",
        "deployment",
        "testing",
        "softSkills",
      ],
      properties: {
        frontend: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
        backend: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
        database: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
        authentication: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
        payment: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
        deployment: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
        testing: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
        softSkills: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
      },
    },
    generatedEmailSubject: { type: GeminiType.STRING },
    generatedApplicationEmail: { type: GeminiType.STRING },
    interviewPreparationQuestions: {
      type: GeminiType.ARRAY,
      items: { type: GeminiType.STRING },
    },
    scoreBreakdown: {
      type: GeminiType.OBJECT,
      required: [
        "technicalSkillMatch",
        "projectRelevance",
        "experienceMatch",
        "locationWorkModeMatch",
        "resumeKeywordMatch",
      ],
      properties: {
        technicalSkillMatch: { type: GeminiType.NUMBER },
        projectRelevance: { type: GeminiType.NUMBER },
        experienceMatch: { type: GeminiType.NUMBER },
        locationWorkModeMatch: { type: GeminiType.NUMBER },
        resumeKeywordMatch: { type: GeminiType.NUMBER },
      },
    },
    finalScore: { type: GeminiType.NUMBER },
    matchLabel: { type: GeminiType.STRING },
    scoreExplanation: { type: GeminiType.STRING },
  },
} as const;

function buildUserPrompt(profile: CandidateProfileForAnalysis, jobInput: JobAnalysisInput): string {
  return `
Analyze the job post against the candidate profile.
Return only valid JSON. No markdown. No comments. No prose outside JSON.

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
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}
function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeMatchLabel(score: number, label: unknown): MatchLabel {
  if (label === "Strong Match" || label === "Good Match" || label === "Partial Match" || label === "Weak Match") return label;
  if (score >= 80) return "Strong Match";
  if (score >= 60) return "Good Match";
  if (score >= 40) return "Partial Match";
  return "Weak Match";
}

function parseResumeKeywords(value: unknown): ResumeKeywordSuggestions {
  const obj = asRecord(value);
  return {
    frontend: asStringArray(obj?.frontend).slice(0, 3),
    backend: asStringArray(obj?.backend).slice(0, 3),
    database: asStringArray(obj?.database).slice(0, 3),
    authentication: asStringArray(obj?.authentication).slice(0, 3),
    payment: asStringArray(obj?.payment).slice(0, 3),
    deployment: asStringArray(obj?.deployment).slice(0, 3),
    testing: asStringArray(obj?.testing).slice(0, 3),
    softSkills: asStringArray(obj?.softSkills).slice(0, 3),
  };
}

function limitWords(value: string, maxWords: number): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return value.trim();
  }

  return words.slice(0, maxWords).join(" ").trim();
}

function limitSentences(value: string, maxSentences: number): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const sentenceMatches = trimmed.match(/[^.!?]+[.!?]*/g) ?? [];
  const cleanedSentences = sentenceMatches
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (cleanedSentences.length <= maxSentences) {
    return trimmed;
  }

  return cleanedSentences.slice(0, maxSentences).join(" ").trim();
}

function parseScoreBreakdown(value: unknown): ScoreBreakdown {
  const obj = asRecord(value);
  return {
    technicalSkillMatch: clamp(asNumber(obj?.technicalSkillMatch), 0, 40),
    projectRelevance: clamp(asNumber(obj?.projectRelevance), 0, 25),
    experienceMatch: clamp(asNumber(obj?.experienceMatch), 0, 15),
    locationWorkModeMatch: clamp(asNumber(obj?.locationWorkModeMatch, asNumber(obj?.locationMatch)), 0, 10),
    resumeKeywordMatch: clamp(asNumber(obj?.resumeKeywordMatch), 0, 10),
  };
}

function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV !== "production";
}
function logDevDiagnostics(label: string, details: Record<string, unknown>): void {
  if (!isDevelopmentEnvironment()) return;
  console.warn(`[job-analysis] ${label}`, details);
}

function extractJsonCandidate(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) return "";
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();
  return trimmed;
}

function parseJsonObjectFromText(rawText: string): unknown {
  const candidate = extractJsonCandidate(rawText);
  const trimmedCandidate = candidate.trim();
  if (!trimmedCandidate) {
    throw new JsonParseFailureError({ reason: "empty_candidate", responseLength: rawText.length, candidateLength: candidate.length });
  }
  try {
    return JSON.parse(candidate);
  } catch (candidateError) {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const sliced = candidate.slice(firstBrace, lastBrace + 1).trim();
      try {
        return JSON.parse(sliced);
      } catch (slicedError) {
        throw new JsonParseFailureError({
          reason: "json_parse_failed",
          responseLength: rawText.length,
          candidateLength: candidate.length,
          slicedLength: sliced.length,
          candidateParseMessage: candidateError instanceof Error ? candidateError.message : "unknown_parse_error",
          slicedParseMessage: slicedError instanceof Error ? slicedError.message : "unknown_parse_error",
        });
      }
    }
    throw new JsonParseFailureError({
      reason: "json_markers_missing",
      responseLength: rawText.length,
      candidateLength: candidate.length,
      candidateParseMessage: candidateError instanceof Error ? candidateError.message : "unknown_parse_error",
    });
  }
}

function parseAndValidateAnalysis(rawText: string): JobFitAnalysis {
  const parsed = parseJsonObjectFromText(rawText);
  const obj = asRecord(parsed);
  if (!obj) {
    throw new JsonParseFailureError({ reason: "parsed_root_is_not_object", responseLength: rawText.length });
  }

  const missingTopLevelKeys = requiredTopLevelKeys.filter((key) => !(key in obj));
  if (missingTopLevelKeys.length > 0) {
    logDevDiagnostics("shape_diagnostics", { responseLength: rawText.length, missingTopLevelKeys });
  }

  const scoreBreakdown = parseScoreBreakdown(obj.scoreBreakdown);
  const computedFinalScore = clamp(
    scoreBreakdown.technicalSkillMatch + scoreBreakdown.projectRelevance + scoreBreakdown.experienceMatch + scoreBreakdown.locationWorkModeMatch + scoreBreakdown.resumeKeywordMatch,
    0,
    100,
  );
  const finalScore = clamp(asNumber(obj.finalScore, computedFinalScore), 0, 100);

  return {
    jobTitle: asString(obj.jobTitle, "Not specified"),
    companyName: asString(obj.companyName, "Not specified"),
    requiredSkills: asStringArray(obj.requiredSkills).slice(0, 5),
    niceToHaveSkills: asStringArray(obj.niceToHaveSkills).slice(0, 5),
    responsibilities: asStringArray(obj.responsibilities).slice(0, 5),
    experienceLevel: asString(obj.experienceLevel, "Not specified"),
    workType: asString(obj.workType, asString(obj.extractedWorkType, "Not specified")),
    location: asString(obj.location, asString(obj.extractedLocation, "Not specified")),
    redFlags: asStringArray(obj.redFlags).slice(0, 3),
    matchedSkills: asStringArray(obj.matchedSkills).slice(0, 5),
    partiallyMatchedSkills: asStringArray(obj.partiallyMatchedSkills).slice(0, 5),
    missingSkills: asStringArray(obj.missingSkills).slice(0, 5),
    relevantProjects: asStringArray(obj.relevantProjects).slice(0, 3),
    weakAreas: asStringArray(obj.weakAreas).slice(0, 3),
    resumeKeywordSuggestions: parseResumeKeywords(obj.resumeKeywordSuggestions),
    generatedEmailSubject: asString(obj.generatedEmailSubject, "Application for this role"),
    generatedApplicationEmail: limitWords(
      asString(obj.generatedApplicationEmail),
      120,
    ),
    interviewPreparationQuestions: asStringArray(obj.interviewPreparationQuestions).slice(0, 3),
    scoreBreakdown,
    finalScore,
    matchLabel: normalizeMatchLabel(finalScore, obj.matchLabel),
    scoreExplanation: limitSentences(asString(obj.scoreExplanation), 2),
  };
}

async function parseWithRepair(rawText: string): Promise<JobFitAnalysis> {
  try {
    return parseAndValidateAnalysis(rawText);
  } catch (error) {
    if (!(error instanceof JsonParseFailureError)) {
      throw error;
    }

    logDevDiagnostics("repair_attempt", {
      reason: error.diagnostics.reason,
      responseLength: rawText.length,
    });

    const repairedText = await repairGeminiJson({
      invalidJsonText: rawText,
      responseSchema: analysisResponseSchema as unknown as Record<string, unknown>,
    });

    if (!repairedText) {
      throw new InvalidAiJsonError();
    }

    return parseAndValidateAnalysis(repairedText);
  }
}

export async function analyzeJobWithGemini(
  profile: CandidateProfileForAnalysis,
  jobInput: JobAnalysisInput,
): Promise<AnalyzeJobProviderResult> {
  try {
    const rawText = await generateGeminiJson({
      systemInstruction,
      prompt: buildUserPrompt(profile, jobInput),
      responseSchema: analysisResponseSchema as unknown as Record<string, unknown>,
      temperature: 0.2,
      maxOutputTokens: 3072,
    });

    logDevDiagnostics("raw_response_received", { provider: "gemini", responseLength: rawText.length });

    if (!rawText) {
      throw new InvalidAiJsonError();
    }

    const analysis = await parseWithRepair(rawText);
    return { analysis, provider: "gemini", model: getGeminiModelName() };
  } catch (error) {
    const summary = getAiErrorSummary(error);
    logDevDiagnostics("provider_failed", { provider: "gemini", summary });

    if (error instanceof InvalidAiJsonError) {
      throw error;
    }

    throw error;
  }
}
