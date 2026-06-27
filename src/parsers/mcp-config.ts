import { asRecord } from "./json.js";
import type { McpConfigData, McpServerDefinition } from "../artifacts/types.js";

export function parseMcpConfig(value: unknown): McpConfigData {
  const root = asRecord(value);
  const candidates = [
    { key: "mcpServers", value: root.mcpServers },
    { key: "servers", value: root.servers }
  ];

  const servers: McpServerDefinition[] = [];

  for (const candidate of candidates) {
    const record = asRecord(candidate.value);
    for (const [name, rawServer] of Object.entries(record)) {
      const server = asRecord(rawServer);
      servers.push({
        name,
        command: typeof server.command === "string" ? server.command : undefined,
        args: Array.isArray(server.args) ? server.args.filter((arg): arg is string => typeof arg === "string") : [],
        env: asRecord(server.env),
        raw: rawServer,
        jsonPointer: `/${candidate.key}/${escapeJsonPointer(name)}`
      });
    }
  }

  return { servers };
}

function escapeJsonPointer(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

