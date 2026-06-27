import path from "node:path";

export function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

export function relativePosix(rootPath: string, absolutePath: string): string {
  return toPosixPath(path.relative(rootPath, absolutePath));
}

