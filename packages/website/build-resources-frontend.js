import { transformAsync } from "@babel/core";
import presetEnv from "@babel/preset-env";
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import microQuickJSSyntax from "../../dev/wasm-web-runtimes/examples/codemirror/babel-microquickjs.js";
import lowerDatasetAccess from "./babel-resources-dataset.js";

const directory = dirname(fileURLToPath(import.meta.url));
const workspace = join(directory, "..", "..");
const generated = join(directory, "generated");
const frontend = join(directory, "frontend");
const microRuntime = join(workspace, "dev", "wasm-web-runtimes", "examples",
  "microquickjs-suite", "microquickjs-guest-runtime");
const compiler = join(microRuntime, "microquickjs", "mqjs");
const rustupCargo = join(process.env.HOME || "", ".cargo", "bin", "cargo");
const cargo = process.env.CARGO || (existsSync(rustupCargo) ? rustupCargo : "cargo");
const baseRuntime = join(microRuntime, "target", "wasm32-unknown-unknown", "release",
  "wasm_web_container_example_runtime.wasm");

const aliases = new Map([
  ["/-/resources-site/project-history.js", join(workspace, "packages", "hub", "src", "project-history.js")],
  ["/-/resources-site/url-pattern.js", join(workspace, "packages", "hub", "src", "url-pattern.js")],
  ["/-/resources-site/container-elements.js", join(workspace, "packages", "hub", "src", "container-elements.js")],
  ["/-/resources-site/project-archive.js", join(workspace, "packages", "hub", "src", "project-archive.js")],
  ["/-/resources-site/project-editor-runtime.js", join(directory, "project-frontend-services.js")],
  ["/-/style-use/index.js", join(workspace, "packages", "style-use", "src", "index.js")],
]);

const modern = await build({
  entryPoints: [join(directory, "resources-frontend-entry.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  write: false,
  plugins: [{
    name: "resources-guest-imports",
    setup(build) {
      build.onResolve({ filter: /^\/-\// }, ({ path }) => {
        const resolved = aliases.get(path);
        if (!resolved) throw new Error(`No Resources guest import for ${path}`);
        return { path: resolved };
      });
    },
  }],
}).then((result) => result.outputFiles[0].text);

// esbuild bundles every import, leaving only top-level await. Wrapping first
// gives Babel one ordinary async function to lower for MicroQuickJS.
const wrapped = `(async function resourcesFrontend() {\n${modern}\n})()` +
  `.catch(function (error) { var message = String(error); var stack = error && error.stack; ` +
  `__wwcReportError(stack && stack.indexOf(message) < 0 ? message + "\\n" + stack : stack || message); });\n`;
const lowered = (await transformAsync(wrapped, {
  comments: false,
  compact: false,
  plugins: [lowerDatasetAccess, microQuickJSSyntax],
  presets: [[presetEnv, {
    bugfixes: true,
    loose: true,
    modules: false,
    targets: { ie: "11" },
    useBuiltIns: false,
  }]],
})).code;

await mkdir(generated, { recursive: true });
const source = join(generated, "resources-frontend-microquickjs.js");
const bytecode = join(generated, "resources-frontend-application.bin");
await writeFile(source, lowered);
execFileSync(compiler, ["-m32", "-o", bytecode, source], { stdio: "inherit" });

const runtimeSource = await readFile(join(workspace, "dev", "wasm-web-runtimes",
  "examples", "codemirror", "generated", "microquickjs-runtime.js"), "utf8");
const runtimeFile = join(generated, "resources-frontend-runtime.js");
const runtimeBytecode = join(generated, "resources-frontend-runtime.bin");
await writeFile(runtimeFile, runtimeSource);
execFileSync(compiler, ["-m32", "-o", runtimeBytecode, runtimeFile], { stdio: "inherit" });

execFileSync(cargo, ["build", "--release", "--target", "wasm32-unknown-unknown"], {
  cwd: microRuntime,
  stdio: "inherit",
});
execFileSync(process.execPath, [
  join(workspace, "dev", "wasm-web-runtimes", "examples", "microquickjs-suite", "scripts", "stamp-wasm.js"),
  baseRuntime,
  join(generated, "resources-frontend-microquickjs.wasm"),
  `runtime.bin=${runtimeBytecode}`,
  `application.bin=${bytecode}`,
], { stdio: "inherit" });

const machine = await build({
  entryPoints: [join(directory, "frontend", "machine.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  write: false,
}).then((result) => result.outputFiles[0].text);
await writeFile(join(frontend, "machine.js"), machine);

const controller = await build({
  entryPoints: [join(directory, "frontend", "controller.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  external: ["./machine.js"],
  plugins: [{
    name: "resources-browser-machine",
    setup(build) {
      build.onResolve({ filter: /dev\/wasm-web-machine\/dist\/module\/wasm-web-machine\.js$/ },
        () => ({ path: "./machine.js", external: true }));
    },
  }],
  write: false,
}).then((result) => result.outputFiles[0].text);
await writeFile(join(frontend, "controller.js"), controller);

console.log(`Resources frontend: ${lowered.length} source bytes`);
