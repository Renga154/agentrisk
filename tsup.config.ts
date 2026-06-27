import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["cjs"],
  target: "node20",
  platform: "node",
  dts: true,
  clean: true,
  sourcemap: false,
  splitting: false,
  noExternal: [/./],
  outExtension() {
    return { js: ".cjs" };
  }
});
