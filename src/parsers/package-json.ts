import { asRecord } from "./json.js";
import type { PackageJsonData } from "../artifacts/types.js";

export function parsePackageJson(value: unknown): PackageJsonData {
  const root = asRecord(value);
  return {
    name: typeof root.name === "string" ? root.name : undefined,
    scripts: stringRecord(root.scripts),
    dependencies: stringRecord(root.dependencies),
    devDependencies: stringRecord(root.devDependencies),
    optionalDependencies: stringRecord(root.optionalDependencies)
  };
}

function stringRecord(value: unknown): Record<string, string> {
  const record = asRecord(value);
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

