import { transformFileAsync } from "@babel/core";
import presetEnv from "@babel/preset-env";
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import microQuickJSSyntax from "./babel-microquickjs.js";

const generated = new URL("generated/", import.meta.url);
const modern = new URL("generated/codemirror-modern.js", import.meta.url).pathname;
const ponyfills = new URL("generated/microquickjs-ponyfills.js", import.meta.url).pathname;
const microModern = new URL("generated/codemirror-micro-modern.js", import.meta.url).pathname;
const micro = new URL("generated/codemirror-micro.js", import.meta.url).pathname;

await mkdir(generated, { recursive: true });

await build({
  entryPoints: [new URL("src/modern-entry.js", import.meta.url).pathname],
  bundle: true,
  format: "iife",
  target: "es2022",
  outfile: modern,
});

await build({
  entryPoints: [new URL("src/microquickjs-ponyfills.js", import.meta.url).pathname],
  bundle: true,
  format: "iife",
  target: "es2022",
  outfile: ponyfills,
});

await writeFile(microModern,
  await readFile(ponyfills, "utf8") + "\n" + await readFile(modern, "utf8"));

const lowered = await transformFileAsync(microModern, {
  comments: false,
  compact: false,
  plugins: [microQuickJSSyntax],
  presets: [[presetEnv, {
    bugfixes: true,
    loose: true,
    modules: false,
    targets: { ie: "11" },
    useBuiltIns: false,
  }]],
});

await writeFile(micro, lowered.code);
