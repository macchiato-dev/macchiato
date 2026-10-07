import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const workspace = join(directory, "..", "..");
const generated = join(directory, "generated");
const frontend = join(directory, "frontend");
const runtime = join(workspace, "dev", "wasm-web-runtimes", "quickjs");
execFileSync(process.execPath, [join(workspace, "dev/wasm-web-runtimes/examples/codemirror/build.js"),
  "--environments-only"], { stdio: "inherit" });
const rustupCargo = join(process.env.HOME || "", ".cargo", "bin", "cargo");
const cargo = process.env.CARGO || (existsSync(rustupCargo) ? rustupCargo : "cargo");

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

// Imports are bundled, but modern JavaScript stays intact inside QuickJS.
// The browser only receives the controller and the machine host.
const wrapped = `(async function resourcesFrontend() {\n${modern}\n})()` +
  `.catch(function (error) { var message = String(error); var stack = error && error.stack; ` +
  `__wwcReportError(stack && stack.indexOf(message) < 0 ? message + "\\n" + stack : stack || message); });\n`;
await mkdir(generated, { recursive: true });
const source = join(generated, "resources-frontend-quickjs.js");
await writeFile(source, wrapped);
execFileSync(cargo, ["build", "--release", "--target", "wasm32-unknown-unknown"], {
  cwd: runtime,
  env: { ...process.env, WWC_CANONICAL_HOST: "1",
    WWC_GUEST_ENVIRONMENT: join(workspace, "dev/wasm-web-runtimes/examples/codemirror/generated/canonical-dom.js"),
    WWC_APPLICATION_SOURCE: source },
  stdio: "inherit",
});
await copyFile(join(runtime, "target/wasm32-unknown-unknown/release/wasm_web_container_quickjs_runtime.wasm"),
  join(generated, "resources-frontend-quickjs.wasm"));

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

console.log(`Resources frontend: ${wrapped.length} ES6+ source bytes`);
