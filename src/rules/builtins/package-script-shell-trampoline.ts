import type { PackageJsonData } from "../../artifacts/types.js";
import { regexLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const shellTrampolinePattern = /\b(?:sh|bash|zsh|fish|cmd(?:\.exe)?|powershell|pwsh)\b\s+(?:-c|\/c|-Command|\/command)\b/i;

export const packageScriptShellTrampoline: Rule = {
  id: "package-script-shell-trampoline",
  title: "Package script hides behavior behind a shell trampoline",
  summary: "Flags package scripts that delegate to shell command strings.",
  defaultSeverity: "medium",
  tags: ["package-json", "execution"],
  scope: "document",
  targetKinds: ["packageJson"],
  evaluate(ctx, artifacts) {
    return artifacts.flatMap((artifact) => {
      const data = artifact.data as PackageJsonData;
      return Object.entries(data.scripts).flatMap(([name, script]) => {
        if (!shellTrampolinePattern.test(script)) {
          return [];
        }

        return [
          ctx.createFinding({
            ruleId: "package-script-shell-trampoline",
            artifact,
            severity: "medium",
            confidence: "medium",
            category: "execution",
            message: `package.json script "${name}" runs through a shell trampoline.`,
            description: "Shell trampolines can obscure chained commands and platform-specific execution behavior.",
            help: "Prefer direct Node or package commands for scripts that agents or CI may invoke.",
            location: regexLocation(artifact, shellTrampolinePattern),
            evidence: [
              { kind: "scriptName", value: name },
              { kind: "text", value: script }
            ],
            tags: ["package-json", "shell"]
          })
        ];
      });
    });
  }
};

