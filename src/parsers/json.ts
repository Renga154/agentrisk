export interface JsonParseResult {
  ok: true;
  value: unknown;
}

export interface JsonParseError {
  ok: false;
  message: string;
}

export function parseJson(raw: string): JsonParseResult | JsonParseError {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

