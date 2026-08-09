import { build } from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";

await rm(new URL("./dist/", import.meta.url), { recursive: true, force: true });
await mkdir(new URL("./dist/", import.meta.url), { recursive: true });
await build({
  entryPoints: [new URL("./main.jsx", import.meta.url).pathname],
  bundle: true,
  format: "iife",
  target: ["es2020"],
  outdir: new URL("./dist/", import.meta.url).pathname,
  entryNames: "app",
  assetNames: "asset-[hash]",
  legalComments: "eof",
  minify: true,
});
await copyFile(new URL("./index.html", import.meta.url), new URL("./dist/index.html", import.meta.url));
