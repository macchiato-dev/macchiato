import { build } from "esbuild";
import { transformAsync } from "@babel/core";
import presetEnv from "@babel/preset-env";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import microQuickJSSyntax from "../../dev/wasm-web-runtimes/examples/codemirror/babel-microquickjs.js";
import lowerDatasetAccess from "./babel-resources-dataset.js";

const directory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(directory, "generated");
const workspace = join(directory, "..", "..");
const rustupCargo = join(process.env.HOME || "", ".cargo", "bin", "cargo");
const cargo = process.env.CARGO || (existsSync(rustupCargo) ? rustupCargo : "cargo");
await mkdir(outputDirectory, { recursive: true });
const lowerForMicroQuickJS = async (source, plugins = []) => (await transformAsync(source, {
  comments: false,
  compact: false,
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
    globalThis.__codeEditorRegisterLanguage("javascript", function () { return javascript({ typescript: false }); });
    globalThis.__codeEditorRegisterLanguage("typescript", function () { return javascript({ typescript: true }); });`,
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
  markdown: `import { markdown } from "@codemirror/lang-markdown";
    import { LanguageDescription } from "@codemirror/language";
    var descriptions = [
      ["JavaScript", ["javascript", "js", "jsx"], ["js", "jsx", "mjs", "cjs"]],
      ["TypeScript", ["typescript", "ts", "tsx"], ["ts", "tsx", "mts", "cts"]],
      ["HTML", ["html"], ["html", "htm"]], ["CSS", ["css"], ["css"]],
      ["JSON", ["json"], ["json"]], ["Vue", ["vue"], ["vue"]],
      ["Svelte", ["svelte"], ["svelte"]]
    ].map(function (item) { return LanguageDescription.of({ name: item[0], alias: item[1], extensions: item[2],
      load: function () { return Promise.resolve(globalThis.__codeEditorLoadedLanguage(item[1][0])); } }); });
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
    WWC_APPLICATION_SOURCE: join(directory, "project-output-bootstrap.js"),
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
const editorCoreSource = await build({
  entryPoints: [join(workspace, "packages", "project-editor", "src", "guest.js")],
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
  join(directory, "project-editor-controller.es5.js")], { stdio: "inherit" });
execFileSync(process.execPath, [
  join(workspace, "dev", "wasm-web-runtimes", "examples", "microquickjs-suite", "scripts", "stamp-wasm.js"),
  join(microRuntime, "target", "wasm32-unknown-unknown", "release", "wasm_web_container_example_runtime.wasm"),
  join(outputDirectory, "project-editor-quickjs-runtime.wasm"),
  `runtime.bin=${join(microExample, "generated", "microquickjs-runtime.bin")}`,
  `application.bin=${controllerBytecode}`,
  `editor.bin=${editorBytecode}`,
  `project.bin=${projectServicesBytecode}`,
], { stdio: "inherit" });
