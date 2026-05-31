function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function includesText(value: string, pattern: string): boolean {
  return value.toLowerCase().includes(pattern);
}

function collectCandidateMessages(error: unknown): string[] {
  const messages: string[] = [];
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (typeof current === "string") {
      messages.push(current);
      continue;
    }

    if (current instanceof Error) {
      messages.push(current.message);
    }

    const record = asRecord(current);
    if (!record) {
      continue;
    }

    const message = asString(record.message);
    const statusText = asString(record.status);
    const details = asString(record.details);
    const codeText = asString(record.code);
    const rawResponseText = asString(record.responseText);

    if (message) messages.push(message);
    if (statusText) messages.push(statusText);
    if (details) messages.push(details);
    if (codeText) messages.push(codeText);
    if (rawResponseText) messages.push(rawResponseText);

    if ("cause" in record) queue.push(record.cause);
    if ("error" in record) queue.push(record.error);
    if ("response" in record) queue.push(record.response);
  }

  return messages;
}

function collectCandidateStatuses(error: unknown): number[] {
  const statuses: number[] = [];
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) {
      continue;
    }
    seen.add(current);

    const record = asRecord(current);
    if (!record) {
      continue;
    }

    const statusValue = asNumber(record.status);
    const codeValue = asNumber(record.code);
    const statusFromResponse = asNumber(asRecord(record.response)?.status);

    if (statusValue !== null) statuses.push(statusValue);
    if (codeValue !== null) statuses.push(codeValue);
    if (statusFromResponse !== null) statuses.push(statusFromResponse);

    if ("cause" in record) queue.push(record.cause);
    if ("error" in record) queue.push(record.error);
    if ("response" in record) queue.push(record.response);
  }

  return statuses;
}

export function isAiQuotaError(error: unknown): boolean {
  const statuses = collectCandidateStatuses(error);
  if (statuses.includes(429)) {
    return true;
  }

  const combined = collectCandidateMessages(error).join(" ").toLowerCase();
  return (
    includesText(combined, "resource_exhausted") ||
    includesText(combined, "quota") ||
    includesText(combined, "rate limit")
  );
}

export function getAiErrorSummary(error: unknown): {
  errorName: string;
  errorMessage: string;
  errorCode?: string | number;
  errorStatus?: string | number;
} {
  const errorRecord = asRecord(error) ?? {};
  const statusFromResponse = asRecord(errorRecord.response)?.status;
  const rawMessage = error instanceof Error ? error.message : asString(errorRecord.message);
  const compactMessage = rawMessage.replace(/\s+/g, " ").trim().slice(0, 220);

  return {
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: compactMessage || "unknown_error",
    errorCode:
      typeof errorRecord.code === "string" || typeof errorRecord.code === "number"
        ? errorRecord.code
        : undefined,
    errorStatus:
      typeof errorRecord.status === "string" ||
      typeof errorRecord.status === "number"
        ? errorRecord.status
        : typeof statusFromResponse === "string" ||
            typeof statusFromResponse === "number"
          ? statusFromResponse
          : undefined,
  };
}
