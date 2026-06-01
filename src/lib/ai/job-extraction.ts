import "server-only";

import {
  GeminiType,
  generateGeminiJson,
  repairGeminiJson,
} from "@/lib/ai/gemini";
import type { ExtractedJobDetails } from "@/lib/ai/types";

export class InvalidJobExtractionError extends Error {
  constructor() {
    super("Could not extract job details. Please paste the job post manually.");
    this.name = "InvalidJobExtractionError";
  }
}

const extractionSystemInstruction = `
You extract job posting details for JobFit Copilot.
Return only valid JSON. No markdown. No comments. No prose outside JSON.
If a field is missing, return an empty string for that field.
Keep jobPostText faithful to the source text without adding unrelated content.
`.trim();

const requiredExtractionKeys = [
  "jobTitle",
  "companyName",
  "sourceUrl",
  "workType",
  "salaryRange",
  "jobPostText",
  "location",
  "experienceLevel",
  "confidenceNotes",
] as const;

const extractionResponseSchema = {
  type: GeminiType.OBJECT,
  required: [...requiredExtractionKeys],
  properties: {
    jobTitle: { type: GeminiType.STRING },
    companyName: { type: GeminiType.STRING },
    sourceUrl: { type: GeminiType.STRING },
    workType: { type: GeminiType.STRING },
    salaryRange: { type: GeminiType.STRING },
    jobPostText: { type: GeminiType.STRING },
    location: { type: GeminiType.STRING },
    experienceLevel: { type: GeminiType.STRING },
    confidenceNotes: { type: GeminiType.STRING },
  },
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV !== "production";
}

function logDevDiagnostics(label: string, details: Record<string, unknown>): void {
  if (!isDevelopmentEnvironment()) return;
  console.warn(`[job-extraction] ${label}`, details);
}

function extractJsonCandidate(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) return "";

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  return trimmed;
}

function parseJsonObjectFromText(rawText: string): Record<string, unknown> {
  const candidate = extractJsonCandidate(rawText);

  if (!candidate.trim()) {
    logDevDiagnostics("json_candidate_empty", { responseLength: rawText.length });
    throw new InvalidJobExtractionError();
  }

  try {
    const parsed = JSON.parse(candidate);
    const obj = asRecord(parsed);
    if (!obj) throw new InvalidJobExtractionError();
    return obj;
  } catch (candidateError) {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const sliced = candidate.slice(firstBrace, lastBrace + 1).trim();
      try {
        const parsed = JSON.parse(sliced);
        const obj = asRecord(parsed);
        if (!obj) throw new InvalidJobExtractionError();
        return obj;
      } catch (slicedError) {
        logDevDiagnostics("json_parse_failed", {
          responseLength: rawText.length,
          candidateLength: candidate.length,
          slicedLength: sliced.length,
          candidateParseMessage:
            candidateError instanceof Error
              ? candidateError.message
              : "unknown_parse_error",
          slicedParseMessage:
            slicedError instanceof Error ? slicedError.message : "unknown_parse_error",
        });
        throw new InvalidJobExtractionError();
      }
    }

    logDevDiagnostics("json_markers_missing", {
      responseLength: rawText.length,
      candidateLength: candidate.length,
      candidateParseMessage:
        candidateError instanceof Error
          ? candidateError.message
          : "unknown_parse_error",
    });
    throw new InvalidJobExtractionError();
  }
}

function normalizeExtraction(rawText: string, fallbackJobPostText = ""): ExtractedJobDetails {
  const obj = parseJsonObjectFromText(rawText);
  const missingTopLevelKeys = requiredExtractionKeys.filter((key) => !(key in obj));

  if (missingTopLevelKeys.length > 0) {
    logDevDiagnostics("shape_diagnostics", {
      responseLength: rawText.length,
      missingTopLevelKeys,
    });
  }

  return {
    jobTitle: asString(obj.jobTitle),
    companyName: asString(obj.companyName),
    sourceUrl: asString(obj.sourceUrl),
    workType: asString(obj.workType),
    salaryRange: asString(obj.salaryRange),
    jobPostText: asString(obj.jobPostText) || fallbackJobPostText,
    location: asString(obj.location),
    experienceLevel: asString(obj.experienceLevel),
    confidenceNotes: asString(obj.confidenceNotes),
  };
}

function buildTextExtractionPrompt(jobPostText: string): string {
  return `
Extract job details from this pasted job post.
Return only valid JSON. No markdown. No comments. No prose outside JSON.

Return strict JSON with this exact shape:
{
  "jobTitle": "",
  "companyName": "",
  "sourceUrl": "",
  "workType": "",
  "salaryRange": "",
  "jobPostText": "",
  "location": "",
  "experienceLevel": "",
  "confidenceNotes": ""
}

Job post text:
${jobPostText}
`.trim();
}

async function parseWithRepair(rawText: string, fallbackJobPostText: string): Promise<ExtractedJobDetails> {
  try {
    return normalizeExtraction(rawText, fallbackJobPostText);
  } catch {
    const repairedText = await repairGeminiJson({
      invalidJsonText: rawText,
      responseSchema: extractionResponseSchema as unknown as Record<string, unknown>,
    });

    if (!repairedText) {
      throw new InvalidJobExtractionError();
    }

    return normalizeExtraction(repairedText, fallbackJobPostText);
  }
}

export async function extractJobDetailsWithGemini(jobPostText: string): Promise<ExtractedJobDetails> {
  const rawText = await generateGeminiJson({
    systemInstruction: extractionSystemInstruction,
    prompt: buildTextExtractionPrompt(jobPostText),
    responseSchema: extractionResponseSchema as unknown as Record<string, unknown>,
    temperature: 0,
    maxOutputTokens: 2048,
  });

  logDevDiagnostics("text_extraction_response_received", {
    provider: "gemini",
    responseLength: rawText.length,
  });

  if (!rawText) {
    throw new InvalidJobExtractionError();
  }

  return parseWithRepair(rawText, jobPostText);
}
