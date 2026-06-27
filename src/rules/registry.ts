import { conflictingAgentInstructions } from "./builtins/conflicting-agent-instructions.js";
import { instructionApprovalBypass } from "./builtins/instruction-approval-bypass.js";
import { instructionPolicyOverride } from "./builtins/instruction-policy-override.js";
import { instructionRemoteToolInstall } from "./builtins/instruction-remote-tool-install.js";
import { instructionSecretExfiltration } from "./builtins/instruction-secret-exfiltration.js";
import { mcpRemoteFetchExec } from "./builtins/mcp-remote-fetch-exec.js";
import { mcpSensitiveEnvPassThrough } from "./builtins/mcp-sensitive-env-pass-through.js";
import { mcpShellWrapperCommand } from "./builtins/mcp-shell-wrapper-command.js";
import { mcpUnpinnedDlx } from "./builtins/mcp-unpinned-dlx.js";
import { packagePostinstallRemoteExec } from "./builtins/package-postinstall-remote-exec.js";
import { packageScriptShellTrampoline } from "./builtins/package-script-shell-trampoline.js";
import type { Rule } from "./types.js";

export const builtinRules: Rule[] = [
  mcpRemoteFetchExec,
  mcpShellWrapperCommand,
  mcpUnpinnedDlx,
  mcpSensitiveEnvPassThrough,
  packagePostinstallRemoteExec,
  packageScriptShellTrampoline,
  instructionSecretExfiltration,
  instructionApprovalBypass,
  instructionPolicyOverride,
  instructionRemoteToolInstall,
  conflictingAgentInstructions
];

export function getRuleById(id: string): Rule | undefined {
  return builtinRules.find((rule) => rule.id === id);
}

