import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { x as extractTar } from "tar";
import type { ReadEntry } from "tar";
import type { Stats } from "node:fs";
import type { ResolvedTarget, TargetOptions, TargetSource } from "./types.js";

const userAgent = "AgentRisk/0.1.0 (+https://github.com/Renga154/agentrisk)";

export async function resolveTarget(input: string, options: TargetOptions): Promise<ResolvedTarget> {
  const github = parseGitHubTarget(input, options.githubRef);
  if (github) {
    return resolveArchiveTarget({
      kind: "github",
      input,
      resolved: github.downloadUrl,
      temporary: true,
      note: github.note
    }, options);
  }

  if (input.startsWith("npm:")) {
    return resolveNpmTarget(input, options);
  }

  if (isHttpUrl(input)) {
    if (!isArchiveLike(input)) {
      throw new Error(`Remote URL is not a supported archive target: ${input}`);
    }
    return resolveArchiveTarget({
      kind: "remote-archive",
      input,
      resolved: input,
      temporary: true
    }, options);
  }

  const absolute = path.resolve(input);
  const stat = await fs.stat(absolute).catch(() => undefined);
  if (!stat) {
    throw new Error(`Target not found: ${input}`);
  }

  if (stat.isDirectory()) {
    return {
      rootPath: absolute,
      source: {
        kind: "local-directory",
        input,
        resolved: absolute,
        temporary: false
      },
      cleanup: async () => {}
    };
  }

  if (stat.isFile() && isArchiveLike(absolute)) {
    return resolveLocalArchive(input, absolute, options);
  }

  throw new Error(`Unsupported target type: ${input}`);
}

async function resolveNpmTarget(input: string, options: TargetOptions): Promise<ResolvedTarget> {
  const spec = parseNpmSpec(input);
  const packageUrl = `https://registry.npmjs.org/${encodeURIComponent(spec.name).replace(/^%40/, "@")}`;
  const response = await fetch(packageUrl, { headers: { "user-agent": userAgent } });
  if (!response.ok) {
    throw new Error(`Failed to fetch npm metadata for ${spec.name}: HTTP ${response.status}`);
  }

  const metadata = (await response.json()) as NpmMetadata;
  const version = spec.version ?? metadata["dist-tags"]?.latest;
  if (!version) {
    throw new Error(`npm package ${spec.name} has no latest dist-tag; specify npm:${spec.name}@<version>`);
  }

  const packageVersion = metadata.versions?.[version];
  if (!packageVersion?.dist?.tarball) {
    throw new Error(`npm package ${spec.name}@${version} was not found`);
  }

  return resolveArchiveTarget({
    kind: "npm",
    input,
    resolved: packageVersion.dist.tarball,
    temporary: true,
    note: `${spec.name}@${version}`
  }, options);
}

async function resolveLocalArchive(input: string, absolutePath: string, options: TargetOptions): Promise<ResolvedTarget> {
  const workspace = await createTempWorkspace(options.keepTemp);
  await extractArchive(absolutePath, workspace.rootPath);
  const scanRoot = await selectArchiveScanRoot(workspace.rootPath);
  return {
    rootPath: scanRoot,
    source: {
      kind: "local-archive",
      input,
      resolved: absolutePath,
      temporary: true
    },
    cleanup: workspace.cleanup
  };
}

async function resolveArchiveTarget(source: TargetSource, options: TargetOptions): Promise<ResolvedTarget> {
  const workspace = await createTempWorkspace(options.keepTemp);
  const archivePath = path.join(workspace.rootPath, "target.tgz");
  await downloadToFile(source.resolved, archivePath, options.maxDownloadSize);
  await extractArchive(archivePath, workspace.rootPath);
  await fs.rm(archivePath, { force: true });
  const scanRoot = await selectArchiveScanRoot(workspace.rootPath);

  return {
    rootPath: scanRoot,
    source,
    cleanup: workspace.cleanup
  };
}

async function createTempWorkspace(keepTemp: boolean): Promise<{ rootPath: string; cleanup(): Promise<void> }> {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "agentrisk-"));
  return {
    rootPath,
    cleanup: keepTemp ? async () => {} : async () => fs.rm(rootPath, { recursive: true, force: true })
  };
}

async function downloadToFile(url: string, destination: string, maxBytes: number): Promise<void> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": userAgent,
      accept: "application/octet-stream"
    }
  });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error(`Download is larger than max download size (${maxBytes} bytes): ${url}`);
  }

  let bytes = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        callback(new Error(`Download exceeded max download size (${maxBytes} bytes): ${url}`));
        return;
      }
      callback(null, chunk);
    }
  });

  await pipeline(Readable.fromWeb(response.body), limiter, createWriteStream(destination));
}

async function extractArchive(archivePath: string, destination: string): Promise<void> {
  let entries = 0;
  const maxEntries = 30_000;

  await extractTar({
    file: archivePath,
    cwd: destination,
    preservePaths: false,
    filter(entryPath: string, entry: ReadEntry | Stats) {
      entries += 1;
      if (entries > maxEntries) {
        throw new Error(`Archive has more than ${maxEntries} entries`);
      }
      if (path.isAbsolute(entryPath) || entryPath.split(/[\\/]/).includes("..")) {
        return false;
      }
      if ("type" in entry && (entry.type === "SymbolicLink" || entry.type === "Link")) {
        return false;
      }
      return true;
    }
  });
}

async function selectArchiveScanRoot(rootPath: string): Promise<string> {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const visible = entries.filter((entry) => entry.name !== "target.tgz" && entry.name !== ".DS_Store");
  const directories = visible.filter((entry) => entry.isDirectory());
  const files = visible.filter((entry) => entry.isFile());
  if (directories.length === 1 && files.length === 0) {
    return path.join(rootPath, directories[0]!.name);
  }
  return rootPath;
}

function parseGitHubTarget(input: string, refOverride?: string): { downloadUrl: string; note: string } | undefined {
  let owner: string | undefined;
  let repo: string | undefined;
  let ref: string | undefined = refOverride;

  if (input.startsWith("github:")) {
    const withoutPrefix = input.slice("github:".length);
    const [repoPart, fragmentRef] = withoutPrefix.split("#", 2);
    const parts = repoPart.split("/");
    owner = parts[0];
    repo = parts[1]?.replace(/\.git$/, "");
    ref = ref ?? fragmentRef;
  } else if (isHttpUrl(input)) {
    const url = new URL(input);
    if (url.hostname !== "github.com") {
      return undefined;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    owner = parts[0];
    repo = parts[1]?.replace(/\.git$/, "");
    if (!ref && parts[2] === "tree" && parts[3]) {
      ref = parts.slice(3).join("/");
    }
  }

  if (!owner || !repo) {
    return undefined;
  }

  const encodedOwner = encodeURIComponent(owner);
  const encodedRepo = encodeURIComponent(repo);
  const encodedRef = encodeURIComponent(ref ?? "HEAD");
  const downloadUrl = `https://codeload.github.com/${encodedOwner}/${encodedRepo}/tar.gz/${encodedRef}`;
  return {
    downloadUrl,
    note: `${owner}/${repo}${ref ? `#${ref}` : ""}`
  };
}

function parseNpmSpec(input: string): { name: string; version?: string } {
  const spec = input.slice("npm:".length).trim();
  if (!spec) {
    throw new Error("npm target must be formatted as npm:<package> or npm:<package>@<version>");
  }

  if (spec.startsWith("@")) {
    const slash = spec.indexOf("/");
    const versionAt = slash === -1 ? -1 : spec.indexOf("@", slash + 1);
    return versionAt === -1
      ? { name: spec }
      : { name: spec.slice(0, versionAt), version: spec.slice(versionAt + 1) };
  }

  const versionAt = spec.lastIndexOf("@");
  return versionAt <= 0
    ? { name: spec }
    : { name: spec.slice(0, versionAt), version: spec.slice(versionAt + 1) };
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

function isArchiveLike(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.endsWith(".tgz") || lower.endsWith(".tar.gz") || lower.endsWith(".tar");
}

interface NpmMetadata {
  "dist-tags"?: Record<string, string>;
  versions?: Record<string, { dist?: { tarball?: string } }>;
}
