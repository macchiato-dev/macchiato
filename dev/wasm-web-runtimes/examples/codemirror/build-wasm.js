import { execFileSync } from "node:child_process";
import { copyFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const example = resolve(new URL(".", import.meta.url).pathname);
const runtime = resolve(example, "../../quickjs");
const environment = resolve(example, "src/microquickjs-dom.js");
const canonicalEnvironment = resolve(example, "generated/canonical-dom.js");
const microESNextEnvironment = resolve(example, "generated/microesnext-dom.js");
const output = resolve(runtime,
  "target/wasm32-unknown-unknown/release/wasm_web_container_quickjs_runtime.wasm");
const requestedTargets = new Set((process.env.CODEMIRROR_TARGETS ||
  "simple,full,large,multi").split(",").filter(Boolean));

for (const name of ["simple", "full", "large", "multi"]) {
  if (!requestedTargets.has(name)) continue;
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

if (requestedTargets.has("full")) {
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
}

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
if (requestedTargets.has("full")) {
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
}

if (requestedTargets.has("multi")) {
  const microMultiApplication = resolve(example, "generated/codemirror-multi-micro.bin");
  execFileSync(microCompiler, ["-m32", "-o", microMultiApplication,
    resolve(example, "generated/codemirror-multi-micro.js")], { stdio: "inherit" });
  const microMultiDestination = resolve(example,
    "generated/codemirror-multi-microquickjs.wasm");
  execFileSync(process.execPath, [
    resolve(example, "../microquickjs-suite/scripts/stamp-wasm.js"),
    resolve(microRuntime,
      "target/wasm32-unknown-unknown/release/wasm_web_container_example_runtime.wasm"),
    microMultiDestination,
    `runtime.bin=${microRuntimeBytecode}`,
    `application.bin=${microMultiApplication}`,
  ], { stdio: "inherit" });
console.log(`microquickjs multi: ${(await stat(microMultiDestination)).size} bytes`);
}

const microESNextRuntime = resolve(example, "../../microesnext");
const microESNextOutput = resolve(microESNextRuntime,
  "target/wasm32-unknown-unknown/release/wasm_web_machine_microesnext_runtime.wasm");
for (const name of ["simple", "multi"]) {
  if (!requestedTargets.has(name)) continue;
  execFileSync("cargo", ["build", "--release", "--target", "wasm32-unknown-unknown"], {
    cwd: microESNextRuntime,
    env: { ...process.env, MICROESNEXT_GUEST_ENVIRONMENT: microESNextEnvironment,
      MICROESNEXT_APPLICATION_SOURCE: resolve(example,
        name !== "simple" ?
          `generated/codemirror-${name}-microesnext.js` :
          `generated/codemirror-${name}.js`) },
    stdio: "inherit",
  });
  const filename = name === "simple" ? "codemirror-microesnext.wasm" :
    `codemirror-${name}-microesnext.wasm`;
  const destination = resolve(example, `generated/${filename}`);
  await copyFile(microESNextOutput, destination);
  console.log(`microesnext ${name}: ${(await stat(destination)).size} bytes`);
}
