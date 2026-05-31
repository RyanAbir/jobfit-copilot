import "server-only";

import { Type } from "@google/genai";
import { createGeminiClient, getGeminiModelName } from "@/lib/ai/gemini";
import { getAiErrorSummary } from "@/lib/ai/error-utils";
import {
  getNvidiaApiKey,
  getNvidiaBaseUrl,
  getNvidiaModelName,
  hasNvidiaApiKey,
} from "@/lib/ai/nvidia";
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

export type AnalysisProvider = "nvidia" | "gemini";

export type AnalyzeJobProviderResult = {
  analysis: JobFitAnalysis;
  model: string;
  provider: AnalysisProvider;
};

class JsonParseFailureError extends InvalidAiJsonError {
  diagnostics: Record<string, unknown>;

  constructor(diagnostics: Record<string, unknown>) {
    super();
    this.name = "JsonParseFailureError";
    this.diagnostics = diagnostics;
  }
}

class AnalysisProviderChainError extends Error {
  diagnostics: Record<string, unknown>;

  constructor(diagnostics: Record<string, unknown>) {
    super("All AI providers failed.");
    this.name = "AnalysisProviderChainError";
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
- scoreExplanation must be 2-4 sentences.
- generatedApplicationEmail must be concise.
- interviewPreparationQuestions must contain at most 5 items.
`.trim();

const repairSystemInstruction = `
You repair malformed JSON.
Return only valid JSON that matches the required schema exactly.
No markdown. No comments. No prose outside JSON.
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
  type: Type.OBJECT,
  required: [...requiredTopLevelKeys],
  properties: {
    jobTitle: { type: Type.STRING },
    companyName: { type: Type.STRING },
    requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    niceToHaveSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
    experienceLevel: { type: Type.STRING },
    workType: { type: Type.STRING },
    location: { type: Type.STRING },
    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
    matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    partiallyMatchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    relevantProjects: { type: Type.ARRAY, items: { type: Type.STRING } },
    weakAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
    resumeKeywordSuggestions: {
      type: Type.OBJECT,
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
        frontend: { type: Type.ARRAY, items: { type: Type.STRING } },
        backend: { type: Type.ARRAY, items: { type: Type.STRING } },
        database: { type: Type.ARRAY, items: { type: Type.STRING } },
        authentication: { type: Type.ARRAY, items: { type: Type.STRING } },
        payment: { type: Type.ARRAY, items: { type: Type.STRING } },
        deployment: { type: Type.ARRAY, items: { type: Type.STRING } },
        testing: { type: Type.ARRAY, items: { type: Type.STRING } },
        softSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    generatedEmailSubject: { type: Type.STRING },
    generatedApplicationEmail: { type: Type.STRING },
    interviewPreparationQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    scoreBreakdown: {
      type: Type.OBJECT,
      required: [
        "technicalSkillMatch",
        "projectRelevance",
        "experienceMatch",
        "locationWorkModeMatch",
        "resumeKeywordMatch",
      ],
      properties: {
        technicalSkillMatch: { type: Type.NUMBER },
        projectRelevance: { type: Type.NUMBER },
        experienceMatch: { type: Type.NUMBER },
        locationWorkModeMatch: { type: Type.NUMBER },
        resumeKeywordMatch: { type: Type.NUMBER },
      },
    },
    finalScore: { type: Type.NUMBER },
    matchLabel: { type: Type.STRING },
    scoreExplanation: { type: Type.STRING },
  },
} as const;

function buildUserPrompt(
  profile: CandidateProfileForAnalysis,
  jobInput: JobAnalysisInput,
): string {
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

Output constraints:
- scoreExplanation: 2-4 sentences.
- generatedApplicationEmail: concise and direct.
- interviewPreparationQuestions: maximum 5 items.
`.trim();
}

function buildRepairPrompt(rawResponseText: string): string {
  return `
The following text should be JSON but is invalid.
Repair it into valid JSON matching the required schema exactly.
Return only JSON.

Invalid JSON text:
${rawResponseText}
`.trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV !== "production";
}

function logDevDiagnostics(
  label: string,
  details: Record<string, unknown>,
): void {
  if (!isDevelopmentEnvironment()) {
    return;
  }

  console.warn(`[job-analysis] ${label}`, details);
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

function getBoundaryCharCodes(value: string): {
  firstNonWhitespaceCharCode: number | null;
  lastNonWhitespaceCharCode: number | null;
} {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      firstNonWhitespaceCharCode: null,
      lastNonWhitespaceCharCode: null,
    };
  }

  return {
    firstNonWhitespaceCharCode: trimmed.charCodeAt(0),
    lastNonWhitespaceCharCode: trimmed.charCodeAt(trimmed.length - 1),
  };
}

function extractJsonCandidate(rawText: string): string {
  const trimmed = rawText.trim();

  if (!trimmed) {
    return "";
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return trimmed;
}

function parseJsonObjectFromText(rawText: string): unknown {
  const candidate = extractJsonCandidate(rawText);
  const trimmedCandidate = candidate.trim();

  if (!trimmedCandidate) {
    throw new JsonParseFailureError({
      reason: "empty_candidate",
      responseLength: rawText.length,
      candidateLength: candidate.length,
      ...getBoundaryCharCodes(candidate),
    });
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
          ...getBoundaryCharCodes(candidate),
          candidateParseMessage:
            candidateError instanceof Error
              ? candidateError.message
              : "unknown_parse_error",
          slicedParseMessage:
            slicedError instanceof Error
              ? slicedError.message
              : "unknown_parse_error",
        });
      }
    }

    throw new JsonParseFailureError({
      reason: "json_markers_missing",
      responseLength: rawText.length,
      candidateLength: candidate.length,
      ...getBoundaryCharCodes(candidate),
      candidateParseMessage:
        candidateError instanceof Error
          ? candidateError.message
          : "unknown_parse_error",
    });
  }
}

function collectTopLevelTypeMismatches(
  obj: Record<string, unknown>,
): string[] {
  const mismatches: string[] = [];
  const stringFields = [
    "jobTitle",
    "companyName",
    "experienceLevel",
    "workType",
    "location",
    "generatedEmailSubject",
    "generatedApplicationEmail",
    "scoreExplanation",
    "matchLabel",
  ];
  const stringArrayFields = [
    "requiredSkills",
    "niceToHaveSkills",
    "responsibilities",
    "redFlags",
    "matchedSkills",
    "partiallyMatchedSkills",
    "missingSkills",
    "relevantProjects",
    "weakAreas",
    "interviewPreparationQuestions",
  ];

  for (const field of stringFields) {
    if (obj[field] !== undefined && typeof obj[field] !== "string") {
      mismatches.push(field);
    }
  }

  for (const field of stringArrayFields) {
    if (obj[field] !== undefined && !Array.isArray(obj[field])) {
      mismatches.push(field);
    }
  }

  if (obj.finalScore !== undefined && typeof obj.finalScore !== "number") {
    mismatches.push("finalScore");
  }

  if (obj.scoreBreakdown !== undefined && !asRecord(obj.scoreBreakdown)) {
    mismatches.push("scoreBreakdown");
  }

  if (
    obj.resumeKeywordSuggestions !== undefined &&
    !asRecord(obj.resumeKeywordSuggestions)
  ) {
    mismatches.push("resumeKeywordSuggestions");
  }

  return mismatches;
}

function parseAndValidateAnalysis(rawText: string): JobFitAnalysis {
  const parsed = parseJsonObjectFromText(rawText);

  try {
    const obj = asRecord(parsed);
    if (!obj) {
      throw new JsonParseFailureError({
        reason: "parsed_root_is_not_object",
        responseLength: rawText.length,
      });
    }

    const missingTopLevelKeys = requiredTopLevelKeys.filter(
      (key) => !(key in obj),
    );
    const typeMismatches = collectTopLevelTypeMismatches(obj);

    if (missingTopLevelKeys.length > 0 || typeMismatches.length > 0) {
      logDevDiagnostics("shape_diagnostics", {
        responseLength: rawText.length,
        missingTopLevelKeys,
        typeMismatchFields: typeMismatches,
      });
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
    const finalScore = clamp(
      asNumber(obj.finalScore, computedFinalScore),
      0,
      100,
    );

    return {
      jobTitle: asString(obj.jobTitle, "Not specified"),
      companyName: asString(obj.companyName, "Not specified"),
      requiredSkills: asStringArray(obj.requiredSkills),
      niceToHaveSkills: asStringArray(obj.niceToHaveSkills),
      responsibilities: asStringArray(obj.responsibilities),
      experienceLevel: asString(obj.experienceLevel, "Not specified"),
      workType: asString(
        obj.workType,
        asString(obj.extractedWorkType, "Not specified"),
      ),
      location: asString(
        obj.location,
        asString(obj.extractedLocation, "Not specified"),
      ),
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
      interviewPreparationQuestions: asStringArray(
        obj.interviewPreparationQuestions,
      ).slice(0, 5),
      scoreBreakdown,
      finalScore,
      matchLabel: normalizeMatchLabel(finalScore, obj.matchLabel),
      scoreExplanation: asString(obj.scoreExplanation),
    };
  } catch (error) {
    if (error instanceof InvalidAiJsonError) {
      throw error;
    }

    logDevDiagnostics("parse_validation_failed", {
      responseLength: rawText.length,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });
    throw new InvalidAiJsonError();
  }
}

function extractModelResponseText(response: unknown): string {
  const responseObj = asRecord(response);

  if (typeof responseObj?.text === "string") {
    return responseObj.text;
  }

  const candidates = Array.isArray(responseObj?.candidates)
    ? responseObj.candidates
    : [];
  const firstCandidate = asRecord(candidates[0]);
  const content = asRecord(firstCandidate?.content);
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const textParts = parts
    .map((part) => asRecord(part))
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean);

  return textParts.join("\n");
}

async function generateGeminiAnalysisResponseText(
  userPrompt: string,
): Promise<string> {
  const client = createGeminiClient();
  const response = await client.models.generateContent({
    model: getGeminiModelName(),
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: analysisResponseSchema,
      temperature: 0.2,
      maxOutputTokens: 3072,
    },
  });

  return extractModelResponseText(response).trim();
}

async function repairInvalidJsonText(rawResponseText: string): Promise<string> {
  const client = createGeminiClient();
  const response = await client.models.generateContent({
    model: getGeminiModelName(),
    contents: buildRepairPrompt(rawResponseText),
    config: {
      systemInstruction: repairSystemInstruction,
      responseMimeType: "application/json",
      responseSchema: analysisResponseSchema,
      temperature: 0,
      maxOutputTokens: 3072,
    },
  });

  return extractModelResponseText(response).trim();
}

type NvidiaChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

function extractOpenAiCompatibleMessageText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const textParts: string[] = [];

  for (const part of content) {
    const partObj = asRecord(part);
    if (!partObj) {
      continue;
    }

    if (typeof partObj.text === "string") {
      textParts.push(partObj.text);
      continue;
    }

    if (partObj.type === "text" && typeof partObj.content === "string") {
      textParts.push(partObj.content);
    }
  }

  return textParts.join("\n");
}

async function generateNvidiaAnalysisResponseText(
  userPrompt: string,
): Promise<string> {
  const apiKey = getNvidiaApiKey();
  const endpoint = `${getNvidiaBaseUrl().replace(/\/+$/, "")}/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getNvidiaModelName(),
      temperature: 0.2,
      max_tokens: 3072,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const failure = new Error(
      `NVIDIA request failed with status ${response.status}.`,
    ) as Error & { status?: number; code?: string };
    failure.status = response.status;
    failure.code = "nvidia_http_error";
    throw failure;
  }

  const payload = (await response.json()) as NvidiaChatCompletionResponse;
  const firstChoice = payload.choices?.[0];
  const rawText = extractOpenAiCompatibleMessageText(firstChoice?.message?.content);
  return rawText.trim();
}

export async function analyzeJobWithGemini(
  profile: CandidateProfileForAnalysis,
  jobInput: JobAnalysisInput,
): Promise<JobFitAnalysis> {
  try {
    createGeminiClient();
  } catch (error) {
    if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
      throw new MissingGeminiApiKeyError();
    }
    throw error;
  }

  const rawText = await generateGeminiAnalysisResponseText(
    buildUserPrompt(profile, jobInput),
  );

  logDevDiagnostics("raw_response_received", {
    provider: "gemini",
    responseLength: rawText.length,
  });

  if (!rawText) {
    throw new InvalidAiJsonError();
  }

  try {
    return parseAndValidateAnalysis(rawText);
  } catch (error) {
    if (!(error instanceof JsonParseFailureError)) {
      throw error;
    }

    logDevDiagnostics("primary_json_parse_failed", {
      provider: "gemini",
      ...error.diagnostics,
    });

    const repairedRawText = await repairInvalidJsonText(rawText);
    logDevDiagnostics("repair_response_received", {
      provider: "gemini",
      responseLength: repairedRawText.length,
    });

    if (!repairedRawText) {
      throw new InvalidAiJsonError();
    }

    try {
      return parseAndValidateAnalysis(repairedRawText);
    } catch (repairError) {
      if (repairError instanceof JsonParseFailureError) {
        logDevDiagnostics("repair_json_parse_failed", {
          provider: "gemini",
          ...repairError.diagnostics,
        });
      }

      throw new InvalidAiJsonError();
    }
  }
}

async function analyzeJobWithNvidia(
  profile: CandidateProfileForAnalysis,
  jobInput: JobAnalysisInput,
): Promise<JobFitAnalysis> {
  const rawText = await generateNvidiaAnalysisResponseText(
    buildUserPrompt(profile, jobInput),
  );

  logDevDiagnostics("raw_response_received", {
    provider: "nvidia",
    responseLength: rawText.length,
  });

  if (!rawText) {
    throw new InvalidAiJsonError();
  }

  return parseAndValidateAnalysis(rawText);
}

export async function analyzeJobWithProviders(
  profile: CandidateProfileForAnalysis,
  jobInput: JobAnalysisInput,
): Promise<AnalyzeJobProviderResult> {
  const providerFailures: Array<{
    provider: AnalysisProvider;
    summary: ReturnType<typeof getAiErrorSummary>;
  }> = [];

  if (hasNvidiaApiKey()) {
    try {
      const analysis = await analyzeJobWithNvidia(profile, jobInput);
      return {
        analysis,
        provider: "nvidia",
        model: getNvidiaModelName(),
      };
    } catch (error) {
      const summary = getAiErrorSummary(error);
      providerFailures.push({ provider: "nvidia", summary });
      logDevDiagnostics("provider_failed", {
        provider: "nvidia",
        summary,
      });
    }
  } else {
    logDevDiagnostics("provider_skipped", {
      provider: "nvidia",
      reason: "missing_nvidia_api_key",
    });
  }

  try {
    const analysis = await analyzeJobWithGemini(profile, jobInput);
    return {
      analysis,
      provider: "gemini",
      model: getGeminiModelName(),
    };
  } catch (error) {
    const summary = getAiErrorSummary(error);
    providerFailures.push({ provider: "gemini", summary });
    logDevDiagnostics("provider_failed", {
      provider: "gemini",
      summary,
    });
  }

  throw new AnalysisProviderChainError({
    providerOrder: ["nvidia", "gemini"],
    providerFailures,
  });
}
