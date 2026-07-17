import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  platform: "node",
  target: "node22",
  deps: {
    neverBundle: ["ink", "react", "zod", "shell-quote"],
  },
  clean: true,
  sourcemap: false,
  outExtensions: () => ({ js: ".js" }),
});
