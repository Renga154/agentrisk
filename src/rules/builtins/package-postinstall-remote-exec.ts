import type { PackageJsonData } from "../../artifacts/types.js";
import { regexLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const lifecycleNames = new Set(["preinstall", "install", "postinstall", "prepare"]);
const riskyPattern = /\b(?:curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod)\b[\s\S]{0,200}(?:\|\s*(?:sh|bash|zsh|fish|iex|invoke-expression)|\b(?:node|python|ruby|perl|sh|bash)\b)/i;

export const packagePostinstallRemoteExec: Rule = {
  id: "package-postinstall-remote-exec",
  title: "Package lifecycle script downloads and executes remote content",
  summary: "Flags install-time package scripts with remote execution behavior.",
  defaultSeverity: "critical",
  tags: ["package-json", "supply-chain", "execution"],
  scope: "document",
  targetKinds: ["packageJson"],
  evaluate(ctx, artifacts) {
    return artifacts.flatMap((artifact) => {
      const data = artifact.data as PackageJsonData;
      return Object.entries(data.scripts).flatMap(([name, script]) => {
        if (!lifecycleNames.has(name) || !riskyPattern.test(script)) {
          return [];
        }

        return [
          ctx.createFinding({
            ruleId: "package-postinstall-remote-exec",
            artifact,
            severity: "critical",
            confidence: "high",
            category: "supply-chain",
            message: `package.json lifecycle script "${name}" appears to download and execute remote content.`,
            description: "Install-time remote execution can run before developers inspect the package.",
            help: "Remove install-time remote execution. Vendor reviewed artifacts or document an explicit manual setup step instead.",
            location: regexLocation(artifact, riskyPattern),
            evidence: [
              { kind: "scriptName", value: name },
              { kind: "text", value: script }
            ],
            tags: ["package-json", "install-script"]
          })
        ];
      });
    });
  }
};

