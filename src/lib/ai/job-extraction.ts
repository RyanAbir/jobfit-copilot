import "server-only";

import { Type, createPartFromBase64, createPartFromText } from "@google/genai";
import { createGeminiClient, getGeminiModelName } from "@/lib/ai/gemini";
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

const jobExtractionResponseSchema = {
  type: Type.OBJECT,
  required: [...requiredExtractionKeys],
  properties: {
    jobTitle: { type: Type.STRING },
    companyName: { type: Type.STRING },
    sourceUrl: { type: Type.STRING },
    workType: { type: Type.STRING },
    salaryRange: { type: Type.STRING },
    jobPostText: { type: Type.STRING },
    location: { type: Type.STRING },
    experienceLevel: { type: Type.STRING },
    confidenceNotes: { type: Type.STRING },
  },
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
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

  console.warn(`[job-extraction] ${label}`, details);
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

function parseJsonObjectFromText(rawText: string): Record<string, unknown> {
  const candidate = extractJsonCandidate(rawText);

  if (!candidate.trim()) {
    logDevDiagnostics("json_candidate_empty", {
      responseLength: rawText.length,
    });
    throw new InvalidJobExtractionError();
  }

  try {
    const parsed = JSON.parse(candidate);
    const obj = asRecord(parsed);
    if (!obj) {
      throw new InvalidJobExtractionError();
    }
    return obj;
  } catch (candidateError) {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const sliced = candidate.slice(firstBrace, lastBrace + 1).trim();
      try {
        const parsed = JSON.parse(sliced);
        const obj = asRecord(parsed);
        if (!obj) {
          throw new InvalidJobExtractionError();
        }
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
            slicedError instanceof Error
              ? slicedError.message
              : "unknown_parse_error",
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

function normalizeExtraction(
  rawText: string,
  fallbackJobPostText = "",
): ExtractedJobDetails {
  const obj = parseJsonObjectFromText(rawText);
  const missingTopLevelKeys = requiredExtractionKeys.filter(
    (key) => !(key in obj),
  );

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

Job post text:
${jobPostText}
`.trim();
}

function buildImageExtractionPrompt(): string {
  return `
Read this job post screenshot and extract the key job details.
Return only valid JSON. No markdown. No comments. No prose outside JSON.
If the screenshot is incomplete, extract only what is visible and explain uncertainty in confidenceNotes.
`.trim();
}

export async function extractJobDetailsFromText(
  jobPostText: string,
): Promise<ExtractedJobDetails> {
  const client = createGeminiClient();
  const response = await client.models.generateContent({
    model: getGeminiModelName(),
    contents: buildTextExtractionPrompt(jobPostText),
    config: {
      systemInstruction: extractionSystemInstruction,
      responseMimeType: "application/json",
      responseSchema: jobExtractionResponseSchema,
      temperature: 0,
      maxOutputTokens: 2048,
    },
  });

  const rawText = extractModelResponseText(response).trim();
  logDevDiagnostics("text_extraction_response_received", {
    responseLength: rawText.length,
  });

  return normalizeExtraction(rawText, jobPostText);
}

export async function extractJobDetailsFromImage(input: {
  imageBase64: string;
  mimeType: string;
}): Promise<ExtractedJobDetails> {
  const client = createGeminiClient();
  const response = await client.models.generateContent({
    model: getGeminiModelName(),
    contents: [
      createPartFromText(buildImageExtractionPrompt()),
      createPartFromBase64(input.imageBase64, input.mimeType),
    ],
    config: {
      systemInstruction: extractionSystemInstruction,
      responseMimeType: "application/json",
      responseSchema: jobExtractionResponseSchema,
      temperature: 0,
      maxOutputTokens: 2048,
    },
  });

  const rawText = extractModelResponseText(response).trim();
  logDevDiagnostics("image_extraction_response_received", {
    responseLength: rawText.length,
  });

  return normalizeExtraction(rawText);
}
