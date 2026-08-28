import { transformAsync } from "@babel/core";
import presetEnv from "@babel/preset-env";
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import microQuickJSSyntax from "./babel-microquickjs.js";

const generated = new URL("generated/", import.meta.url);
const modern = new URL("generated/codemirror-full.js", import.meta.url).pathname;
const ponyfills = new URL("generated/microquickjs-ponyfills.js", import.meta.url).pathname;
const microModern = new URL("generated/codemirror-micro-modern.js", import.meta.url).pathname;
const micro = new URL("generated/codemirror-micro.js", import.meta.url).pathname;
const microRuntime = new URL("generated/microquickjs-runtime.js", import.meta.url).pathname;
const mobileModern = new URL(
  "generated/codemirror-mobile-syntax.js", import.meta.url).pathname;
const mobileMicro = new URL(
  "generated/codemirror-mobile-syntax-micro.js", import.meta.url).pathname;
const microESNextMulti = new URL(
  "generated/codemirror-multi-microesnext.js", import.meta.url).pathname;
const microESNextMultiModern = new URL(
  "generated/codemirror-multi-microesnext-modern.js", import.meta.url).pathname;
const canonicalEnvironment = new URL("generated/canonical-dom.js", import.meta.url);
const microESNextEnvironment = new URL(
  "generated/microesnext-dom.js", import.meta.url);
const microESNextPromise = new URL(
  "generated/microesnext-promise.js", import.meta.url);

await mkdir(generated, { recursive: true });

// Reuse the canonical container wire codec, CSS compiler, and DOM wrappers.
// The example adds only the full-engine browser surface still being developed.
const canonicalRuntimePath = new URL(
  "../microquickjs-suite/microquickjs-guest-runtime/guest-runtime.js",
  import.meta.url);
const cssRuntimePath = new URL(
  "../../../../packages/project-editor/src/constrained-css.js", import.meta.url);
const cssRuntime = (await readFile(cssRuntimePath, "utf8"))
  .replace(/\nexport \{ parseCss as parseConstrainedCss \};\s*$/, "\n");
const canonicalRuntime = cssRuntime + await readFile(canonicalRuntimePath, "utf8");
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
      "globalThis.__wwcReportError = function(message) {\n" +
      "  immediate([3, document.reference, stringIndex(\"postMessage\"), [\n" +
      "    encode(\"__wwcError:\" + String(message))\n" +
      "  ]]);\n" +
      "};")
    .replace(/\/\* Exercise the native lease finalizer[\s\S]*?gc\(\);\n/, "") +
  "\n" + fullEngineSurface);

await build({
  entryPoints: [new URL("src/microesnext-promise.js", import.meta.url).pathname],
  bundle: true,
  format: "iife",
  target: "es2022",
  outfile: microESNextPromise.pathname,
});
await writeFile(microESNextEnvironment,
  await readFile(microESNextPromise, "utf8") + "\n" +
  await readFile(canonicalEnvironment, "utf8"));

const workspace = new URL("../../", import.meta.url);
const fixtureFiles = {
  typescript: "examples/codemirror/fixtures/example.ts",
  html: "examples/codemirror/fixtures/example.html",
  css: "examples/codemirror/fixtures/example.css",
  json: "examples/codemirror/fixtures/example.json",
  markdown: "examples/codemirror/fixtures/example.md",
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
  `export default ${JSON.stringify(Array.from({ length: 500 }, (_, index) =>
    `export const item${index + 1}: number = ${index + 1};`).join("\n"))};\n`);

const repository = new URL("../../../../", import.meta.url);
const tracked = extension => execFileSync(
  "git", ["ls-files", `*.${extension}`],
  { cwd: repository, encoding: "utf8" }).trim().split("\n").filter(Boolean)
  .filter(path => !path.includes("/generated/") && !path.includes("node_modules"));
const separators = {
  javascript: path => `\n/* ${path} */\n`,
  css: path => `\n/* ${path} */\n`,
  markdown: path => `\n\n<!-- ${path} -->\n\n`,
  html: path => `\n<!-- ${path} -->\n`,
};
async function corpus(mode, paths, minimum = 3000, maximum = 6000,
    maximumLineLength = Infinity) {
  let text = "";
  let lines = 0;
  let index = 0;
  while (lines < minimum) {
    const path = paths[index++ % paths.length];
    const source = await readFile(new URL(path, repository), "utf8");
    if (source.split("\n").some(line => line.length > maximumLineLength)) continue;
    text += separators[mode](path) + source;
    lines = text.split("\n").length;
  }
  return text.split("\n").slice(0, maximum).join("\n");
}
const mobileFixtures = {
  javascript: { name: "JavaScript", text: await corpus("javascript", [
    "packages/website/content-form-client.js",
    "packages/app/src/code-annotator.js",
  ]) },
  css: { name: "CSS", text: await corpus("css", tracked("css")) },
  markdown: { name: "Markdown", text: await corpus("markdown", tracked("md")) },
  html: { name: "HTML + CSS + JS",
    text: await corpus("html", tracked("html"), 3000, 6000, 4096) },
};
const longComment = Array.from({ length: 96 }, (_, index) =>
  `   viewport state continuation ${index + 1}`).join("\n");
const mobileProbes = {
  javascript: `
/* viewport-state probe begins above the final viewport
${longComment}
*/
const viewportTemplate = \`a template
that crosses a line\`;
const viewportNumber = 2048;
`,
  css: `
/* viewport-state probe begins above the final viewport
${longComment}
*/
.viewport-probe {
  border-color: rebeccapurple;
  inline-size: 42rem;
}
`,
  markdown: `
\`\`\`javascript
/* a multiline comment inside a fenced JavaScript block
${longComment}
*/
const viewportFence = \`mixed
markdown and JavaScript\`;
\`\`\`

## Viewport fence probe
`,
  html: `
<style>
/* embedded CSS state begins above the final viewport
${longComment}
*/
.viewport-probe { color: rebeccapurple; }
</style>
<script>
/* embedded JavaScript state crosses a line */
const viewportScript = \`mixed
HTML and JavaScript\`;
</script>
`,
};
for (const [mode, fixture] of Object.entries(mobileFixtures)) {
  await writeFile(new URL(`generated/mobile-fixture-${mode}.txt`, import.meta.url),
    fixture.text + mobileProbes[mode]);
}

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
  ["src/multi-entry.js", "generated/codemirror-multi.js"],
  ["src/mobile-syntax-app.js", "generated/codemirror-mobile-syntax.js"],
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
  entryPoints: [new URL("src/multi-microesnext-entry.js", import.meta.url).pathname],
  bundle: true,
  format: "iife",
  target: "es2022",
  outfile: microESNextMultiModern,
});
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
const lowerForMicroESNext = source => source
  .replace(/!--([A-Za-z_$][\w$]*)\.depth/g,
    "!($1.depth = $1.depth - 1)")
  .replace("function crelt() {", "function crelt(...arguments) {")
  .replace("constructor() {\n      super(...arguments);",
    "constructor() {\n      super();");
await writeFile(microESNextMulti, lowerForMicroESNext(
  await readFile(microESNextMultiModern, "utf8")));
await writeFile(micro, await lowerForMicroQuickJS(modernApplication));
await writeFile(new URL("generated/codemirror-multi-micro.js", import.meta.url),
  await lowerForMicroQuickJS(await readFile(
    new URL("generated/codemirror-multi.js", import.meta.url), "utf8")));
await writeFile(mobileMicro, await lowerForMicroQuickJS(
  await readFile(mobileModern, "utf8")));

// MicroQuickJS supplies `print` and `HostReference` as native globals. The
// canonical full-QuickJS build uses equivalent Rust-hosted bindings instead.
const microEnvironment = (await readFile(ponyfills, "utf8")) + "\n" +
  "function releaseHostReferenceLease(reference) { new HostReference(reference); }\n" +
  "function releaseHostReference(reference) { void reference; }\n" +
  "var devicePixelRatio, innerHeight, innerWidth, pageXOffset, pageYOffset;\n" +
  (await readFile(canonicalEnvironment, "utf8"))
    .replace("var bridge = globalThis.bridge;", "var bridge = print;")
    .replaceAll("hostReference(", "new HostReference(") +
  "\nPromise._immediateFn = function(callback) { setTimeout(callback, 0); };\n" +
  "\nload('application.bin');\ncloseGuest();\n";
await writeFile(microRuntime, await lowerForMicroQuickJS(microEnvironment));
