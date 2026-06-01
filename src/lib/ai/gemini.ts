import "server-only";

import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_MODEL = "gemini-2.5-flash";

let cachedClient: GoogleGenAI | null = null;

function getApiKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("Gemini client can only be used on the server.");
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  return apiKey;
}

export function getGeminiModelName(): string {
  return GEMINI_MODEL;
}

function getClient(): GoogleGenAI {
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey: getApiKey() });
  }

  return cachedClient;
}

export async function generateGeminiJson(input: {
  systemInstruction: string;
  prompt: string;
  responseSchema: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const response = await getClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    config: {
      systemInstruction: input.systemInstruction,
      temperature: input.temperature ?? 0.2,
      maxOutputTokens: input.maxOutputTokens ?? 3072,
      responseMimeType: "application/json",
      responseSchema: input.responseSchema,
    },
  });

  return response.text?.trim() ?? "";
}

export async function repairGeminiJson(input: {
  invalidJsonText: string;
  responseSchema: Record<string, unknown>;
}): Promise<string> {
  const response = await getClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `The following text should be valid JSON but is malformed. Fix it and return only valid JSON that matches the exact schema.\n\nMalformed text:\n${input.invalidJsonText}`,
          },
        ],
      },
    ],
    config: {
      systemInstruction:
        "Return valid JSON only. No markdown. No prose. Preserve meaning.",
      temperature: 0,
      maxOutputTokens: 3072,
      responseMimeType: "application/json",
      responseSchema: input.responseSchema,
    },
  });

  return response.text?.trim() ?? "";
}

export const GeminiType = Type;
