import { execFileSync } from "node:child_process";
import { copyFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const example = resolve(new URL(".", import.meta.url).pathname);
const runtime = resolve(example, "../../quickjs");
const environment = resolve(example, "src/microquickjs-dom.js");
const canonicalEnvironment = resolve(example, "generated/canonical-dom.js");
const output = resolve(runtime,
  "target/wasm32-unknown-unknown/release/wasm_web_container_quickjs_runtime.wasm");

for (const name of ["simple", "full", "large"]) {
  const application = resolve(example, `generated/codemirror-${name}.js`);
  execFileSync("cargo", ["build", "--release", "--target", "wasm32-unknown-unknown"], {
    cwd: runtime,
    env: { ...process.env, WWC_GUEST_ENVIRONMENT: canonicalEnvironment,
      WWC_APPLICATION_SOURCE: application, WWC_CANONICAL_HOST: "1" },
    stdio: "inherit",
  });
  const destination = resolve(example, `generated/codemirror-${name}.wasm`);
  await copyFile(output, destination);
  console.log(`${name}: ${(await stat(destination)).size} bytes`);
}

const application = resolve(example, "generated/codemirror-full.js");
execFileSync("cargo", ["build", "--release", "--target", "wasm32-unknown-unknown"], {
  cwd: runtime,
  env: { ...process.env, WWC_GUEST_ENVIRONMENT: canonicalEnvironment,
    WWC_APPLICATION_SOURCE: application, WWC_CANONICAL_HOST: "1" },
  stdio: "inherit",
});
const destination = resolve(example, "generated/codemirror-canonical.wasm");
await copyFile(output, destination);
console.log(`canonical: ${(await stat(destination)).size} bytes`);

const microRuntime = resolve(example,
  "../microquickjs-suite/microquickjs-guest-runtime");
const microCompiler = resolve(microRuntime, "microquickjs/mqjs");
const microRuntimeBytecode = resolve(example, "generated/microquickjs-runtime.bin");
const microApplicationBytecode = resolve(example, "generated/codemirror-micro.bin");
execFileSync("cargo", ["build", "--release", "--target", "wasm32-unknown-unknown"], {
  cwd: microRuntime,
  stdio: "inherit",
});
execFileSync(microCompiler, ["-m32", "-o", microRuntimeBytecode,
  resolve(example, "generated/microquickjs-runtime.js")], { stdio: "inherit" });
execFileSync(microCompiler, ["-m32", "-o", microApplicationBytecode,
  resolve(example, "generated/codemirror-micro.js")], { stdio: "inherit" });
const microDestination = resolve(example, "generated/codemirror-microquickjs.wasm");
execFileSync(process.execPath, [
  resolve(example, "../microquickjs-suite/scripts/stamp-wasm.js"),
  resolve(microRuntime,
    "target/wasm32-unknown-unknown/release/wasm_web_container_example_runtime.wasm"),
  microDestination,
  `runtime.bin=${microRuntimeBytecode}`,
  `application.bin=${microApplicationBytecode}`,
], { stdio: "inherit" });
console.log(`microquickjs: ${(await stat(microDestination)).size} bytes`);
