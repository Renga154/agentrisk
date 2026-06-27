export interface TextLocation {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export function locateText(raw: string, needle: string): TextLocation | undefined {
  if (!needle) {
    return undefined;
  }

  const index = raw.indexOf(needle);
  if (index === -1) {
    return undefined;
  }

  return locationFromIndex(raw, index, needle.length);
}

export function locateRegex(raw: string, regex: RegExp): TextLocation | undefined {
  const match = regex.exec(raw);
  if (!match || match.index === undefined) {
    return undefined;
  }

  return locationFromIndex(raw, match.index, match[0].length);
}

function locationFromIndex(raw: string, index: number, length: number): TextLocation {
  const before = raw.slice(0, index);
  const line = before.split("\n").length;
  const lastNewline = before.lastIndexOf("\n");
  const column = index - lastNewline;

  const matched = raw.slice(index, index + length);
  const matchedLines = matched.split("\n");
  if (matchedLines.length === 1) {
    return {
      line,
      column,
      endLine: line,
      endColumn: column + Math.max(length, 1)
    };
  }

  return {
    line,
    column,
    endLine: line + matchedLines.length - 1,
    endColumn: matchedLines.at(-1)!.length + 1
  };
}

