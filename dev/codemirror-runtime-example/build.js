import { transformFileAsync } from "@babel/core";
import presetEnv from "@babel/preset-env";
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import microQuickJSSyntax from "./babel-microquickjs.js";

const generated = new URL("generated/", import.meta.url);
const modern = new URL("generated/codemirror-full.js", import.meta.url).pathname;
const ponyfills = new URL("generated/microquickjs-ponyfills.js", import.meta.url).pathname;
const microModern = new URL("generated/codemirror-micro-modern.js", import.meta.url).pathname;
const micro = new URL("generated/codemirror-micro.js", import.meta.url).pathname;

await mkdir(generated, { recursive: true });

const workspace = new URL("../../", import.meta.url);
const fixtureFiles = {
  typescript: "dev/codemirror-runtime-example/fixtures/example.ts",
  html: "dev/codemirror-runtime-example/fixtures/example.html",
  css: "dev/codemirror-runtime-example/fixtures/example.css",
  json: "dev/codemirror-runtime-example/fixtures/example.json",
  markdown: "dev/codemirror-runtime-example/fixtures/example.md",
};
const fixtures = {};
for (const [language, path] of Object.entries(fixtureFiles)) {
  fixtures[language] = {
    path,
    text: await readFile(new URL(path, workspace), "utf8"),
  };
}
await writeFile(new URL("generated/fixtures.js", import.meta.url),
  `export default ${JSON.stringify(fixtures)};\n`);
await writeFile(new URL("generated/large-fixture.js", import.meta.url),
  `export default ${JSON.stringify(Array.from({ length: 5000 }, (_, index) =>
    `export const item${index + 1}: number = ${index + 1};`).join("\n"))};\n`);

await build({
  entryPoints: [new URL("src/modern-entry.js", import.meta.url).pathname],
  bundle: true,
  format: "iife",
  target: "es2022",
  outfile: modern,
});

for (const [entry, outfile] of [
  ["src/simple-entry.js", "generated/codemirror-simple.js"],
  ["src/large-entry.js", "generated/codemirror-large.js"],
]) {
  await build({
    entryPoints: [new URL(entry, import.meta.url).pathname],
    bundle: true,
    format: "iife",
    target: "es2022",
    outfile: new URL(outfile, import.meta.url).pathname,
  });
}

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
