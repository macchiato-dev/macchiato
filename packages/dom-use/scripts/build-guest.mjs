import { build } from "esbuild";

await build({
  entryPoints: [new URL("../source/guest-runtime.ts", import.meta.url).pathname],
  outfile: new URL("../src/guest-runtime.js", import.meta.url).pathname,
  bundle: false,
  format: "iife",
  platform: "neutral",
  target: "es2022",
  sourcemap: true,
  logLevel: "warning",
});
