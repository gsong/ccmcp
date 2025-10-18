import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  external: ["ink", "react", "zod", "shell-quote"],
  target: "node22.18",
  shims: false,
  bundle: true,
});
