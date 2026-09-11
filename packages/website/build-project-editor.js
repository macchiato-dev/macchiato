import { build } from "esbuild";
import { transformAsync } from "@babel/core";
import presetEnv from "@babel/preset-env";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import microQuickJSSyntax from "../../dev/wasm-web-runtimes/examples/codemirror/babel-microquickjs.js";
import lowerDatasetAccess from "./babel-resources-dataset.js";
import { editorLanguages } from "../project-editor/src/languages.js";
import { atomCatalogSource } from "../../dev/wasm-web-runtimes/examples/microquickjs-suite/scripts/bytecode-atoms.js";
import { optimizeMutationScans } from "../project-editor/codemirror-mutation-scan.js";

const directory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(directory, "generated");
const workspace = join(directory, "..", "..");
const rustupCargo = join(process.env.HOME || "", ".cargo", "bin", "cargo");
const cargo = process.env.CARGO || (existsSync(rustupCargo) ? rustupCargo : "cargo");
await mkdir(outputDirectory, { recursive: true });
execFileSync(process.execPath, [join(workspace, "dev/wasm-web-runtimes/examples/codemirror/build.js"),
  "--environments-only"], { stdio: "inherit" });
await build({
  entryPoints: [join(directory, "project-output-frame-controller.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  external: ["./machine.js"],
  outfile: join(outputDirectory, "project-output-frame-controller.js"),
});
const lowerForMicroQuickJS = async (source, plugins = []) => (await transformAsync(source, {
  comments: false,
  compact: false,
  // Strings, Sets, and Maps are iterable too; loose array spread changes data.
  assumptions: { iterableIsArray: false },
  plugins: [...plugins, microQuickJSSyntax],
  presets: [[presetEnv, { bugfixes: true, loose: true, modules: false,
    targets: { ie: "11" }, useBuiltIns: false }]],
})).code;
const frameworkRuntime = async (contents) => build({
  stdin: { contents, resolveDir: workspace, sourcefile: "framework-runtime.js" },
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  write: false,
}).then((result) => result.outputFiles[0].text);
const textFacade = 'if (typeof Text === "undefined") globalThis.Text = function Text(value) { return document.createTextNode(value == null ? "" : String(value)); };';
const vueRuntime = await frameworkRuntime(`import * as Vue from "vue"; ${textFacade} globalThis.Vue = Vue;`);
const svelteRuntime = await frameworkRuntime(`import { mount } from "svelte"; import * as SvelteInternal from "svelte/internal/client"; ${textFacade} globalThis.Svelte = { mount }; globalThis.SvelteInternal = SvelteInternal;`);
const threeRuntime = await frameworkRuntime(`import * as THREE from "three"; globalThis.THREE = THREE;`);
await writeFile(join(outputDirectory, "framework-runtimes.js"),
  `export const FRAMEWORK_RUNTIMES = ${JSON.stringify({ vue: vueRuntime, svelte: svelteRuntime, three: threeRuntime })};\n`);
const languageSources = {
  javascript: `import { javascript } from "@codemirror/lang-javascript";
    globalThis.__codeEditorRegisterLanguage("javascript", function () { return javascript(); });
    globalThis.__codeEditorRegisterLanguage("jsx", function () { return javascript({ jsx: true }); });
    globalThis.__codeEditorRegisterLanguage("typescript", function () { return javascript({ typescript: true }); });
    globalThis.__codeEditorRegisterLanguage("tsx", function () { return javascript({ typescript: true, jsx: true }); });`,
  html: `import { html } from "@codemirror/lang-html";
    globalThis.__codeEditorRegisterLanguage("html", html);`,
  css: `import { css } from "@codemirror/lang-css";
    globalThis.__codeEditorRegisterLanguage("css", css);`,
  json: `import { json } from "@codemirror/lang-json";
    globalThis.__codeEditorRegisterLanguage("json", json);`,
  vue: `import { vue } from "@codemirror/lang-vue";
    globalThis.__codeEditorRegisterLanguage("vue", vue);`,
  svelte: `import { svelte } from "@replit/codemirror-lang-svelte";
    globalThis.__codeEditorRegisterLanguage("svelte", svelte);`,
  python: `import { python } from "@codemirror/lang-python";
    globalThis.__codeEditorRegisterLanguage("python", python);`,
  rust: `import { rust } from "@codemirror/lang-rust";
    globalThis.__codeEditorRegisterLanguage("rust", rust);`,
  sql: `import { sql } from "@codemirror/lang-sql";
    globalThis.__codeEditorRegisterLanguage("sql", sql);`,
  yaml: `import { yaml } from "@codemirror/lang-yaml";
    globalThis.__codeEditorRegisterLanguage("yaml", yaml);`,
  cpp: `import { cpp } from "@codemirror/lang-cpp";
    globalThis.__codeEditorRegisterLanguage("cpp", cpp);`,
  markdown: `import { markdown } from "@codemirror/lang-markdown";
    import { LanguageDescription } from "@codemirror/language";
    var descriptions = ${JSON.stringify(editorLanguages.filter((item) => item.name !== "markdown"))}
      .map(function (item) { return LanguageDescription.of({ name: item.title,
        alias: [item.name].concat(item.aliases), extensions: item.extensions,
        load: function () { return globalThis.__codeEditorEnsureLanguage(item.name); } }); });
    globalThis.__codeEditorRegisterLanguage("markdown", function () { return markdown({ codeLanguages: descriptions }); });`,
};
const languageExternals = ["@codemirror/autocomplete", "@codemirror/language", "@codemirror/state",
  "@codemirror/view", "@lezer/common", "@lezer/highlight", "@lezer/lr"];
const languageChunks = {};
for (const [name, contents] of Object.entries(languageSources)) {
  const bundled = await build({
    stdin: { contents, resolveDir: workspace, sourcefile: `${name}-language.js` },
    bundle: true, format: "cjs", platform: "neutral", external: languageExternals,
    banner: { js: "(function(require) {" }, footer: { js: "})(globalThis.__codeMirrorRequire);" },
    minify: true, write: false,
  }).then((result) => result.outputFiles[0].text);
  languageChunks[name] = await lowerForMicroQuickJS(bundled);
}
languageChunks.typescript = languageChunks.javascript;
await writeFile(join(outputDirectory, "project-editor-languages.js"),
  `export const PROJECT_EDITOR_LANGUAGES = ${JSON.stringify(languageChunks)};\n`);
execFileSync("npm", ["run", "build:machine"], {
  cwd: join(workspace, "dev", "wasm-web-machine"), stdio: "inherit",
});
const editorAliases = new Map([
  ["/-/resources-site/project-editor-runtime.js", join(directory, "project-editor-application-services.js")],
  ["/-/resources-site/project-history.js", join(workspace, "packages", "hub", "src", "project-history.js")],
  ["/-/resources-site/url-pattern.js", join(workspace, "packages", "hub", "src", "url-pattern.js")],
  ["/-/resources-site/container-elements.js", join(workspace, "packages", "hub", "src", "container-elements.js")],
  ["/-/resources-site/project-archive.js", join(workspace, "packages", "hub", "src", "project-archive.js")],
]);
const guestSource = await build({
  entryPoints: [join(directory, "project-editor-application.js")],
  bundle: true,
  format: "esm",
  platform: "neutral",
  plugins: [{
    name: "project-editor-guest-imports",
    setup(build) {
      build.onResolve({ filter: /^\/-\// }, ({ path }) => {
        const resolved = editorAliases.get(path);
        if (!resolved) throw new Error(`No project editor guest import for ${path}`);
        return { path: resolved };
      });
    },
  }],
  write: false,
}).then((result) => result.outputFiles[0].text);
const guest = `globalThis.__CODE_EDITOR_DEFER_START__=true;\n` +
  `globalThis.__wwcPostMessage(JSON.stringify({type:"editor-bytecode-started"}));\n` +
  `try { (function projectEditorApplication() {\n${guestSource}\n})(); } catch (error) {\n` +
  `globalThis.__wwcReportError(error && (error.stack || error.message) || String(error));\n}\n`;
const runtime = await build({
  entryPoints: [join(directory, "project-editor-runtime.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  write: false,
}).then((result) => result.outputFiles[0].text);
const builder = await build({
  entryPoints: [join(directory, "project-builder-bootstrap.js")],
  bundle: true,
  format: "iife",
  mainFields: ["browser", "module", "main"],
  platform: "neutral",
  write: false,
}).then((result) => result.outputFiles[0].text);
await writeFile(join(outputDirectory, "project-editor-runtime.js"), runtime);
await writeFile(join(outputDirectory, "project-editor-guest.js"), guest);
await writeFile(join(outputDirectory, "project-builder-guest.js"), builder);

// The output bootstrap shares the application's storage-error adapter. Its
// imports are compiled into guest code, never loaded into the browser realm.
await build({
  entryPoints: [join(directory, "project-output-bootstrap.js")],
  bundle: true, format: "iife", platform: "neutral", target: "es2022",
  outfile: join(outputDirectory, "project-output-bootstrap.js"),
});

execFileSync(cargo, ["build", "--release", "--target", "wasm32-unknown-unknown"], {
  cwd: join(workspace, "dev", "wasm-web-runtimes", "quickjs"),
  env: {
    ...process.env,
    WWC_CANONICAL_HOST: "1",
    WWC_GUEST_ENVIRONMENT: join(workspace, "dev", "wasm-web-runtimes", "quickjs", "src", "message-guest.js"),
    WWC_APPLICATION_SOURCE: join(outputDirectory, "project-builder-guest.js"),
  },
  stdio: "inherit",
});
await copyFile(
  join(workspace, "dev", "wasm-web-runtimes", "quickjs", "target", "wasm32-unknown-unknown", "release", "wasm_web_container_quickjs_runtime.wasm"),
  join(outputDirectory, "project-builder-quickjs-runtime.wasm"),
);

execFileSync(cargo, ["build", "--release", "--target", "wasm32-unknown-unknown"], {
  cwd: join(workspace, "dev", "wasm-web-runtimes", "quickjs"),
  env: {
    ...process.env,
    WWC_CANONICAL_HOST: "1",
    WWC_GUEST_ENVIRONMENT: join(workspace, "dev", "wasm-web-runtimes", "examples", "codemirror", "generated", "canonical-dom.js"),
    WWC_MULTICONTEXT: "1",
    WWC_APPLICATION_SOURCE: join(outputDirectory, "project-output-bootstrap.js"),
  },
  stdio: "inherit",
});
await copyFile(
  join(workspace, "dev", "wasm-web-runtimes", "quickjs", "target", "wasm32-unknown-unknown", "release", "wasm_web_container_quickjs_runtime.wasm"),
  join(outputDirectory, "project-quickjs-runtime.wasm"),
);
const microExample = join(workspace, "dev", "wasm-web-runtimes", "examples", "codemirror");
const microRuntime = join(workspace, "dev", "wasm-web-runtimes", "examples",
  "microquickjs-suite", "microquickjs-guest-runtime");
execFileSync(cargo, ["build", "--release", "--target", "wasm32-unknown-unknown"], {
  cwd: microRuntime,
  env: { ...process.env, WWC_REBUILD_EXAMPLES: "1" },
  stdio: "inherit",
});
// The Cargo build supplies the interpreter, not this DOM runtime's bytecode.
// Compile the environment just generated above; an old demo .bin may contain
// different callback/timer semantics even when every JavaScript file is fresh.
const runtimeBytecode = join(outputDirectory, "project-editor-runtime.bin");
execFileSync(join(microRuntime, "microquickjs", "mqjs"),
  ["-m32", "-o", runtimeBytecode, join(microExample, "generated", "microquickjs-runtime.js")],
  { stdio: "inherit" });
const editorCoreSource = await build({
  entryPoints: [join(workspace, "packages", "project-editor", "src", "guest.js")],
  plugins: [{
    name: "codemirror-mutation-scan",
    setup(builder) {
      builder.onLoad({ filter: /[/\\]@codemirror[/\\]view[/\\]dist[/\\]index\.js$/ }, async ({ path }) => ({
        contents: optimizeMutationScans(await readFile(path, "utf8")),
        loader: "js",
        resolveDir: dirname(path),
      }));
    },
  }],
  bundle: true,
  format: "iife",
  platform: "neutral",
  write: false,
}).then((result) => result.outputFiles[0].text);
const loweredEditor = await lowerForMicroQuickJS(editorCoreSource);
const loweredEditorSource = join(outputDirectory, "project-editor-microquickjs.js");
const editorBytecode = join(outputDirectory, "project-editor-core.bin");
await writeFile(loweredEditorSource, loweredEditor);
execFileSync(join(microRuntime, "microquickjs", "mqjs"),
  ["-m32", "-o", editorBytecode, loweredEditorSource], { stdio: "inherit" });
const languageBytecodes = [];
for (const [name, source] of Object.entries(languageChunks)) {
  if (name === "typescript") continue;
  const sourceFile = join(outputDirectory, `project-editor-language-${name}.js`);
  const bytecodeFile = join(outputDirectory, `project-editor-language-${name}.bin`);
  await writeFile(sourceFile, source);
  execFileSync(join(microRuntime, "microquickjs", "mqjs"),
    ["-m32", "-o", bytecodeFile, sourceFile], { stdio: "inherit" });
  languageBytecodes.push([name, bytecodeFile]);
}
const atomSource = join(outputDirectory, "project-editor-language-atoms.js");
const atomBytecode = join(outputDirectory, "project-editor-language-atoms.bin");
await writeFile(atomSource, atomCatalogSource(await Promise.all(
  languageBytecodes.map(([, file]) => readFile(file)))));
execFileSync(join(microRuntime, "microquickjs", "mqjs"),
  ["-m32", "-o", atomBytecode, atomSource], { stdio: "inherit" });
const projectServicesSource = await build({
  entryPoints: [join(directory, "project-editor-ui.js")],
  bundle: true, format: "iife", platform: "neutral",
  plugins: [{
    name: "project-editor-ui-imports",
    setup(build) {
      build.onResolve({ filter: /^\/-\// }, ({ path }) => {
        const resolved = editorAliases.get(path);
        if (!resolved) throw new Error(`No project editor UI import for ${path}`);
        return { path: resolved };
      });
    },
  }],
  write: false,
}).then((result) => result.outputFiles[0].text);
const loweredProjectServices = await lowerForMicroQuickJS(projectServicesSource,
  [lowerDatasetAccess]);
const projectServicesFile = join(outputDirectory, "project-editor-services-microquickjs.js");
const projectServicesBytecode = join(outputDirectory, "project-editor-services.bin");
await writeFile(projectServicesFile, loweredProjectServices);
execFileSync(join(microRuntime, "microquickjs", "mqjs"),
  ["-m32", "-o", projectServicesBytecode, projectServicesFile], { stdio: "inherit" });
const controllerBytecode = join(outputDirectory, "project-editor-application.bin");
execFileSync(join(microRuntime, "microquickjs", "mqjs"), ["-m32", "-o", controllerBytecode,
  join(directory, "project-editor-bootstrap.es5.js")], { stdio: "inherit" });
execFileSync(process.execPath, [
  join(workspace, "dev", "wasm-web-runtimes", "examples", "microquickjs-suite", "scripts", "stamp-wasm.js"),
  join(microRuntime, "target", "wasm32-unknown-unknown", "release", "wasm_web_container_example_runtime.wasm"),
  join(outputDirectory, "project-editor-quickjs-runtime.wasm"),
  `runtime.bin=${runtimeBytecode}`,
  `application.bin=${controllerBytecode}`,
  `editor.bin=${editorBytecode}`,
  `project.bin=${projectServicesBytecode}`,
  `language-atoms.bin=${atomBytecode}`,
], { stdio: "inherit" });
