import "server-only";

const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_DEFAULT_MODEL = "openrouter/free";

export function hasOpenRouterApiKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function getOpenRouterApiKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("OpenRouter client can only be used on the server.");
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY.");
  }

  return apiKey;
}

export function getOpenRouterBaseUrl(): string {
  return process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_DEFAULT_BASE_URL;
}

export function getOpenRouterModelName(): string {
  return process.env.OPENROUTER_MODEL?.trim() || OPENROUTER_DEFAULT_MODEL;
}
