import type { InstructionDocData } from "../artifacts/types.js";

export function parseInstructionDoc(raw: string): InstructionDocData {
  const lines = raw.split(/\r?\n/);
  const heading = lines.find((line) => line.trim().startsWith("#"));
  return {
    title: heading?.replace(/^#+\s*/, "").trim(),
    text: raw,
    lines
  };
}

