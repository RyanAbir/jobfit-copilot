import "server-only";

import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-2.5-flash";

export function getGeminiModelName(): string {
  return GEMINI_MODEL;
}

export function createGeminiClient(): GoogleGenAI {
  if (typeof window !== "undefined") {
    throw new Error("Gemini client can only be created on the server.");
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  return new GoogleGenAI({ apiKey });
}
