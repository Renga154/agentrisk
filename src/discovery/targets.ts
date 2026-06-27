import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import ignoreImport from "ignore";
import type { Ignore } from "ignore";
import type { ResolvedConfig } from "../config/schema.js";
import { relativePosix } from "../shared/paths.js";

export interface DiscoveredFile {
  path: string;
  absolutePath: string;
  size: number;
}

export interface DiscoveryResult {
  files: DiscoveredFile[];
  skipped: Array<{ path: string; reason: string }>;
}

export async function discoverFiles(config: ResolvedConfig): Promise<DiscoveryResult> {
  const gitignore = config.respectGitignore ? await loadGitignore(config.rootPath) : undefined;
  const entries = await fg(config.include, {
    cwd: config.rootPath,
    absolute: true,
    onlyFiles: true,
    dot: true,
    followSymbolicLinks: config.followSymlinks,
    ignore: config.exclude,
    unique: true
  });

  const files: DiscoveredFile[] = [];
  const skipped: DiscoveryResult["skipped"] = [];

  for (const absolutePath of entries.sort()) {
    const relativePath = relativePosix(config.rootPath, absolutePath);
    if (gitignore?.ignores(relativePath)) {
      skipped.push({ path: relativePath, reason: "ignored by .gitignore" });
      continue;
    }

    const stat = await fs.lstat(absolutePath);
    if (stat.isSymbolicLink() && !config.followSymlinks) {
      skipped.push({ path: relativePath, reason: "symlink skipped" });
      continue;
    }

    if (stat.size > config.maxFileSize) {
      skipped.push({ path: relativePath, reason: `larger than maxFileSize (${config.maxFileSize})` });
      continue;
    }

    files.push({ path: relativePath, absolutePath, size: stat.size });
  }

  return { files, skipped };
}

async function loadGitignore(rootPath: string): Promise<Ignore | undefined> {
  try {
    const raw = await fs.readFile(path.join(rootPath, ".gitignore"), "utf8");
    const ignore = ignoreImport.default ?? ignoreImport;
    return ignore().add(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}
