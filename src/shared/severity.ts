export type Severity = "low" | "medium" | "high" | "critical";

export const severities: Severity[] = ["low", "medium", "high", "critical"];

export function severityRank(severity: Severity): number {
  return severities.indexOf(severity);
}

export function isAtLeastSeverity(actual: Severity, minimum: Severity): boolean {
  return severityRank(actual) >= severityRank(minimum);
}

export function maxSeverity(a: Severity, b: Severity): Severity {
  return severityRank(a) >= severityRank(b) ? a : b;
}

