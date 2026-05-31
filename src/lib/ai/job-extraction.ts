import "server-only";

import { getAiErrorSummary } from "@/lib/ai/error-utils";
import {
  getNvidiaApiKey,
  getNvidiaBaseUrl,
  getNvidiaModelName,
  hasNvidiaApiKey,
} from "@/lib/ai/nvidia";
import {
  getOpenRouterApiKey,
  getOpenRouterBaseUrl,
  getOpenRouterModelName,
  hasOpenRouterApiKey,
} from "@/lib/ai/openrouter";
import type { ExtractedJobDetails } from "@/lib/ai/types";

export class InvalidJobExtractionError extends Error {
  constructor() {
    super("Could not extract job details. Please paste the job post manually.");
    this.name = "InvalidJobExtractionError";
  }
}

type ExtractionProvider = "nvidia" | "openrouter";

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

type OpenAiCompatibleChatCompletionResponse = {
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

async function generateOpenAiCompatibleExtractionResponseText(input: {
  jobPostText: string;
  provider: ExtractionProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}): Promise<string> {
  const endpoint = `${input.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0,
      max_tokens: 2048,
      messages: [
        { role: "system", content: extractionSystemInstruction },
        { role: "user", content: buildTextExtractionPrompt(input.jobPostText) },
      ],
    }),
  });

  if (!response.ok) {
    const failure = new Error(
      `${input.provider} request failed with status ${response.status}.`,
    ) as Error & { status?: number; code?: string };
    failure.status = response.status;
    failure.code = `${input.provider}_http_error`;
    throw failure;
  }

  const payload = (await response.json()) as OpenAiCompatibleChatCompletionResponse;
  const firstChoice = payload.choices?.[0];
  const rawText = extractOpenAiCompatibleMessageText(firstChoice?.message?.content);
  return rawText.trim();
}

async function extractFromProvider(input: {
  provider: ExtractionProvider;
  jobPostText: string;
}): Promise<ExtractedJobDetails> {
  const rawText =
    input.provider === "nvidia"
      ? await generateOpenAiCompatibleExtractionResponseText({
          jobPostText: input.jobPostText,
          provider: "nvidia",
          apiKey: getNvidiaApiKey(),
          baseUrl: getNvidiaBaseUrl(),
          model: getNvidiaModelName(),
        })
      : await generateOpenAiCompatibleExtractionResponseText({
          jobPostText: input.jobPostText,
          provider: "openrouter",
          apiKey: getOpenRouterApiKey(),
          baseUrl: getOpenRouterBaseUrl(),
          model: getOpenRouterModelName(),
        });

  logDevDiagnostics("text_extraction_response_received", {
    provider: input.provider,
    responseLength: rawText.length,
  });

  return normalizeExtraction(rawText, input.jobPostText);
}

export async function extractJobDetailsFromText(
  jobPostText: string,
): Promise<ExtractedJobDetails> {
  const providerFailures: Array<{
    provider: ExtractionProvider;
    summary: ReturnType<typeof getAiErrorSummary>;
  }> = [];

  if (hasNvidiaApiKey()) {
    try {
      return await extractFromProvider({
        provider: "nvidia",
        jobPostText,
      });
    } catch (error) {
      const summary = getAiErrorSummary(error);
      providerFailures.push({ provider: "nvidia", summary });
      logDevDiagnostics("provider_failed", { provider: "nvidia", summary });
    }
  } else {
    logDevDiagnostics("provider_skipped", {
      provider: "nvidia",
      reason: "missing_nvidia_api_key",
    });
  }

  if (hasOpenRouterApiKey()) {
    try {
      return await extractFromProvider({
        provider: "openrouter",
        jobPostText,
      });
    } catch (error) {
      const summary = getAiErrorSummary(error);
      providerFailures.push({ provider: "openrouter", summary });
      logDevDiagnostics("provider_failed", { provider: "openrouter", summary });
    }
  } else {
    logDevDiagnostics("provider_skipped", {
      provider: "openrouter",
      reason: "missing_openrouter_api_key",
    });
  }

  logDevDiagnostics("provider_chain_failed", {
    providerOrder: ["nvidia", "openrouter"],
    providerFailures,
  });

  throw new InvalidJobExtractionError();
}
