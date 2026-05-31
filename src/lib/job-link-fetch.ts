import "server-only";

const MAX_JOB_URL_LENGTH = 2000;
const MAX_HTML_BYTES = 500 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const MIN_READABLE_TEXT_LENGTH = 300;
const MAX_REDIRECTS = 3;

export class JobLinkFetchError extends Error {
  isLinkedIn: boolean;

  constructor(message: string, options?: { isLinkedIn?: boolean }) {
    super(message);
    this.name = "JobLinkFetchError";
    this.isLinkedIn = Boolean(options?.isLinkedIn);
  }
}

function isLinkedInHost(hostname: string): boolean {
  return hostname.toLowerCase().split(".").slice(-2).join(".") === "linkedin.com";
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  if (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  if (/^127\./.test(normalized) || /^10\./.test(normalized)) {
    return true;
  }

  if (/^192\.168\./.test(normalized)) {
    return true;
  }

  const private172Match = normalized.match(/^172\.(\d+)\./);
  if (private172Match) {
    const secondOctet = Number(private172Match[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

export function validatePublicJobUrl(rawUrl: string): URL {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl || trimmedUrl.length > MAX_JOB_URL_LENGTH) {
    throw new JobLinkFetchError("Please enter a valid job post URL.");
  }

  let url: URL;
  try {
    url = new URL(trimmedUrl);
  } catch {
    throw new JobLinkFetchError("Please enter a valid job post URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new JobLinkFetchError("Job post URL must start with http:// or https://.");
  }

  if (url.username || url.password || isPrivateOrLocalHostname(url.hostname)) {
    throw new JobLinkFetchError("Please enter a public job post URL.");
  }

  return url;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCharCode(Number(code)),
    );
}

function htmlToReadableText(html: string): string {
  const withoutHiddenBlocks = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ");

  return decodeHtmlEntities(
    withoutHiddenBlocks
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function looksBlockedOrLoginPage(text: string): boolean {
  const lowered = text.toLowerCase();
  const blockedSignals = [
    "sign in",
    "log in",
    "login",
    "captcha",
    "enable javascript",
    "access denied",
    "temporarily blocked",
    "verify you are human",
    "unusual traffic",
  ];

  return blockedSignals.some((signal) => lowered.includes(signal));
}

async function readLimitedResponseText(response: Response): Promise<string> {
  const reader = response.body?.getReader();

  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (totalBytes < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();

    if (done || !value) {
      break;
    }

    const remainingBytes = MAX_HTML_BYTES - totalBytes;
    const chunk =
      value.byteLength > remainingBytes ? value.slice(0, remainingBytes) : value;
    chunks.push(chunk);
    totalBytes += chunk.byteLength;

    if (value.byteLength > remainingBytes) {
      break;
    }
  }

  await reader.cancel().catch(() => undefined);

  return Buffer.concat(chunks).toString("utf8");
}

async function fetchPublicHtml(
  initialUrl: URL,
  signal: AbortSignal,
): Promise<Response> {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      cache: "no-store",
      credentials: "omit",
      headers: {
        Accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
      },
      redirect: "manual",
      signal,
    });

    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.has("location")
    ) {
      const redirectLocation = response.headers.get("location");

      if (!redirectLocation) {
        return response;
      }

      currentUrl = validatePublicJobUrl(
        new URL(redirectLocation, currentUrl).toString(),
      );
      continue;
    }

    return response;
  }

  throw new JobLinkFetchError(
    "Could not extract this job link directly. Please paste the job description.",
    { isLinkedIn: isLinkedInHost(initialUrl.hostname) },
  );
}

export async function fetchReadableJobLinkText(rawUrl: string): Promise<{
  sourceUrl: string;
  readableText: string;
  isLinkedIn: boolean;
}> {
  const url = validatePublicJobUrl(rawUrl);
  const isLinkedIn = isLinkedInHost(url.hostname);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetchPublicHtml(url, controller.signal);

    if (!response.ok) {
      throw new JobLinkFetchError(
        "Could not extract this job link directly. Please paste the job description.",
        { isLinkedIn },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain")
    ) {
      throw new JobLinkFetchError(
        "Could not extract this job link directly. Please paste the job description.",
        { isLinkedIn },
      );
    }

    const html = await readLimitedResponseText(response);
    const readableText = htmlToReadableText(html);

    if (
      readableText.length < MIN_READABLE_TEXT_LENGTH ||
      looksBlockedOrLoginPage(readableText)
    ) {
      throw new JobLinkFetchError(
        "Could not extract this job link directly. Please paste the job description.",
        { isLinkedIn },
      );
    }

    return {
      sourceUrl: url.toString(),
      readableText,
      isLinkedIn,
    };
  } catch (error) {
    if (error instanceof JobLinkFetchError) {
      throw error;
    }

    throw new JobLinkFetchError(
      "Could not extract this job link directly. Please paste the job description.",
      { isLinkedIn },
    );
  } finally {
    clearTimeout(timeout);
  }
}
