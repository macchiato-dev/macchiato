import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(directory, "generated");
const workspace = join(directory, "..", "..");
const rustupCargo = join(process.env.HOME || "", ".cargo", "bin", "cargo");
const cargo = process.env.CARGO || (existsSync(rustupCargo) ? rustupCargo : "cargo");
execFileSync("npm", ["run", "build:machine"], {
  cwd: join(workspace, "dev", "wasm-web-machine"), stdio: "inherit",
});
const guest = await build({
  entryPoints: [join(directory, "project-editor-guest.js")],
  bundle: true,
  banner: { js: "globalThis.__CODE_EDITOR_DEFER_START__=true;" },
  format: "iife",
  platform: "neutral",
  write: false,
}).then((result) => result.outputFiles[0].text);
const runtime = await build({
  entryPoints: [join(directory, "project-editor-runtime.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  write: false,
}).then((result) => result.outputFiles[0].text);
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "project-editor-runtime.js"), runtime);
await writeFile(join(outputDirectory, "project-editor-guest.js"), guest);

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
execFileSync(cargo, ["build", "--release", "--target", "wasm32-unknown-unknown"], {
  cwd: join(workspace, "dev", "wasm-web-runtimes", "quickjs"),
  env: {
    ...process.env,
    WWC_CANONICAL_HOST: "1",
    WWC_GUEST_ENVIRONMENT: join(workspace, "dev", "wasm-web-runtimes", "examples", "codemirror", "generated", "canonical-dom.js"),
    WWC_APPLICATION_SOURCE: join(outputDirectory, "project-editor-guest.js"),
  },
  stdio: "inherit",
});
await copyFile(
  join(workspace, "dev", "wasm-web-runtimes", "quickjs", "target", "wasm32-unknown-unknown", "release", "wasm_web_container_quickjs_runtime.wasm"),
  join(outputDirectory, "project-editor-quickjs-runtime.wasm"),
);
