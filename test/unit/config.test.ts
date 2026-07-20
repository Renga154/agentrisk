import { describe, expect, it } from "vitest";
import path from "node:path";
import { defaultExclude, defaultInclude } from "../../src/config/defaults.js";
import { loadConfig } from "../../src/config/load-config.js";

describe("loadConfig", () => {
  it("applies CLI rule exclusions over defaults", async () => {
    const config = await loadConfig({
      rootPath: path.resolve("test/fixtures/risky-mcp"),
      excludeRules: ["mcp-remote-fetch-exec"]
    });

    expect(config.rules["mcp-remote-fetch-exec"]).toBe("off");
  });

  it("appends CLI include/exclude globs instead of replacing the defaults", async () => {
    const config = await loadConfig({
      rootPath: path.resolve("test/fixtures/risky-mcp"),
      include: ["**/*.custom"],
      exclude: ["extra/**"]
    });

    expect(config.include).toEqual([...defaultInclude, "**/*.custom"]);
    expect(config.exclude).toEqual([...defaultExclude, "extra/**"]);
  });
});

