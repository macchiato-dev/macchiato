import { transformAsync } from "@babel/core";
import presetEnv from "@babel/preset-env";
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import microQuickJSSyntax from "./babel-microquickjs.js";

const generated = new URL("generated/", import.meta.url);
const modern = new URL("generated/codemirror-full.js", import.meta.url).pathname;
const ponyfills = new URL("generated/microquickjs-ponyfills.js", import.meta.url).pathname;
const microModern = new URL("generated/codemirror-micro-modern.js", import.meta.url).pathname;
const micro = new URL("generated/codemirror-micro.js", import.meta.url).pathname;
const microRuntime = new URL("generated/microquickjs-runtime.js", import.meta.url).pathname;
const canonicalEnvironment = new URL("generated/canonical-dom.js", import.meta.url);

await mkdir(generated, { recursive: true });

// Reuse the canonical container wire codec, CSS compiler, and DOM wrappers.
// The example adds only the full-engine browser surface still being developed.
const canonicalRuntimePath = new URL(
  "../wasm-web-container/examples/microquickjs-guest-runtime/guest-runtime.js",
  import.meta.url);
const canonicalRuntime = await readFile(canonicalRuntimePath, "utf8");
const runtimeEnd = canonicalRuntime.indexOf("function attributes(source)");
if (runtimeEnd < 0) throw new Error("canonical guest runtime boundary was not found");
const fullEngineSurface = await readFile(
  new URL("src/canonical-codemirror-dom.js", import.meta.url), "utf8");
await writeFile(canonicalEnvironment,
  "var FONT_RESOURCES = {};\nvar RUNTIME_RESOURCES = { files: {} };\n" +
  canonicalRuntime.slice(0, runtimeEnd)
    .replace("var bridge = print;", "var bridge = globalThis.bridge;")
    .replaceAll("new HostReference(reference)", "hostReference(reference)")
    .replace("var document = new GuestDocument(documentReference[1]);",
      "var document = new GuestDocument(documentReference[1]);\n" +
      "globalThis.__wwcReportError = function(error) { immediate([3, document.reference, " +
      "stringIndex('debug'), [encode(String(error))]]); };")
    .replace(/\/\* Exercise the native lease finalizer[\s\S]*?gc\(\);\n/, "") +
  "\n" + fullEngineSurface);

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

const lowerForMicroQuickJS = async source => (await transformAsync(source, {
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
})).code;

const modernApplication = await readFile(modern, "utf8");
await writeFile(microModern, modernApplication);
await writeFile(micro, await lowerForMicroQuickJS(modernApplication));

// MicroQuickJS supplies `print` and `HostReference` as native globals. The
// canonical full-QuickJS build uses equivalent Rust-hosted bindings instead.
const microEnvironment = (await readFile(ponyfills, "utf8")) + "\n" +
  "function releaseHostReferenceLease(reference) { new HostReference(reference); }\n" +
  "function releaseHostReference(reference) { void reference; }\n" +
  (await readFile(canonicalEnvironment, "utf8"))
    .replace("var bridge = globalThis.bridge;", "var bridge = print;")
    .replaceAll("hostReference(", "new HostReference(") +
  "\nload('application.bin');\ncloseGuest();\n";
await writeFile(microRuntime, await lowerForMicroQuickJS(microEnvironment));
