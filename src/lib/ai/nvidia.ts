import "server-only";

const NVIDIA_DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_DEFAULT_MODEL = "deepseek-ai/deepseek-v4-pro";

export function hasNvidiaApiKey(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY);
}

export function getNvidiaApiKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("NVIDIA client can only be used on the server.");
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing NVIDIA_API_KEY.");
  }

  return apiKey;
}

export function getNvidiaBaseUrl(): string {
  return process.env.NVIDIA_BASE_URL?.trim() || NVIDIA_DEFAULT_BASE_URL;
}

export function getNvidiaModelName(): string {
  return process.env.NVIDIA_MODEL?.trim() || NVIDIA_DEFAULT_MODEL;
}
