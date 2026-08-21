import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

const root = resolve(new URL(".", import.meta.url).pathname);
const runtime = resolve(root, "../../quickjs");
const runtimeOutput = resolve(runtime,
  "target/wasm32-unknown-unknown/release/wasm_web_container_quickjs_runtime.wasm");
const generated = resolve(root, "generated");
const cargo = process.env.CARGO || resolve(homedir(), ".cargo/bin/cargo");
await mkdir(generated, { recursive: true });

// Assemble the generic full-engine browser facade currently shared with the
// canonical CodeMirror example. It speaks only wasm-web-machine primitives;
// none of the editor-specific *-use adapters are present in these guests.
const basePath = resolve(root,
  "../microquickjs-suite/microquickjs-guest-runtime/guest-runtime.js");
const surfacePath = resolve(root, "../codemirror/src/canonical-codemirror-dom.js");
const base = await readFile(basePath, "utf8");
const boundary = base.indexOf("function attributes(source)");
if (boundary < 0) throw new Error("browser runtime boundary was not found");
const environment = "var FONT_RESOURCES = {};\nvar RUNTIME_RESOURCES = { files: {} };\n" +
  base.slice(0, boundary)
    .replace("var bridge = print;", "var bridge = globalThis.bridge;")
    .replaceAll("new HostReference(reference)", "hostReference(reference)")
    .replace("var document = new GuestDocument(documentReference[1]);",
      "var document = new GuestDocument(documentReference[1]);\n" +
      "globalThis.__wwcReportError = function() {};")
    .replace(/\/\* Exercise the native lease finalizer[\s\S]*?gc\(\);\n/, "") +
  "\n" + await readFile(surfacePath, "utf8");
const environmentPath = resolve(generated, "browser-environment.js");
await writeFile(environmentPath, environment);

const requested = process.argv.slice(2);
const examples = requested.length ? requested : ["prosemirror", "wordgard", "xterm"];
for (const name of examples) {
  if (!["prosemirror", "wordgard", "xterm"].includes(name)) {
    throw new Error(`Unknown browser editor example: ${name}`);
  }
  const application = resolve(generated, `${name}.js`);
  await build({
    entryPoints: [resolve(root, `src/${name}.js`)],
    bundle: true,
    format: "iife",
    target: "es2022",
    outfile: application,
    loader: { ".css": "text" },
  });
  execFileSync(cargo, ["build", "--release", "--target", "wasm32-unknown-unknown"], {
    cwd: runtime,
    env: { ...process.env, WWC_GUEST_ENVIRONMENT: environmentPath,
      WWC_APPLICATION_SOURCE: application, WWC_CANONICAL_HOST: "1" },
    stdio: "inherit",
  });
  const destination = resolve(generated, `${name}.wasm`);
  await copyFile(runtimeOutput, destination);
  console.log(`${name}: ${(await stat(destination)).size} bytes`);
}
