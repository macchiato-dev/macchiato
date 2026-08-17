import { execFileSync } from "node:child_process";
import { copyFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const example = resolve(new URL(".", import.meta.url).pathname);
const runtime = resolve(example, "../quickjs-guest-runtime");
const environment = resolve(example, "src/microquickjs-dom.js");
const output = resolve(runtime,
  "target/wasm32-unknown-unknown/release/wasm_web_container_quickjs_runtime.wasm");

for (const name of ["simple", "full", "large"]) {
  const application = resolve(example, `generated/codemirror-${name}.js`);
  execFileSync("cargo", ["build", "--release", "--target", "wasm32-unknown-unknown"], {
    cwd: runtime,
    env: { ...process.env, WWC_GUEST_ENVIRONMENT: environment,
      WWC_APPLICATION_SOURCE: application },
    stdio: "inherit",
  });
  const destination = resolve(example, `generated/codemirror-${name}.wasm`);
  await copyFile(output, destination);
  console.log(`${name}: ${(await stat(destination)).size} bytes`);
}
