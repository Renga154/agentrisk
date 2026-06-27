import type { ScanResult } from "../artifacts/types.js";

export function renderJson(result: ScanResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

