import { describe, expect, it } from "vitest";
import path from "node:path";
import { loadConfig } from "../../src/config/load-config.js";

describe("loadConfig", () => {
  it("applies CLI rule exclusions over defaults", async () => {
    const config = await loadConfig({
      rootPath: path.resolve("test/fixtures/risky-mcp"),
      excludeRules: ["mcp-remote-fetch-exec"]
    });

    expect(config.rules["mcp-remote-fetch-exec"]).toBe("off");
  });
});

