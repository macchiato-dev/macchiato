import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const engine = join(here, "vendor/microquickjs");
const libcPonyfill = join(here, "libc-ponyfill/include");
const generated = join(here, "generated");
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};
const options = (name) => process.argv.flatMap((value, index) =>
  value === name && process.argv[index + 1] ? [process.argv[index + 1]] : []);
const runtimeSources = options("--runtime");
const applicationSources = options("--application");
if (!applicationSources.length) applicationSources.push(join(here, "application.js"));
const output = option("--output", join(generated, "microquickjs-server.wasm"));
const bytecodeDirectory = option("--bytecode-dir", dirname(output));
const chunkBytes = Number(option("--chunk-bytes", "16384"));
const sourceRoot = option("--source-root", process.cwd());
mkdirSync(generated, { recursive: true });
mkdirSync(bytecodeDirectory, { recursive: true });
const rustc = process.env.RUSTC || join(process.env.HOME, ".cargo/bin/rustc");
const builtinsDirectory = execFileSync(rustc,
  ["--print", "target-libdir", "--target", "wasm32-unknown-unknown"],
  { encoding: "utf8" }).trim();
const builtins = join(builtinsDirectory,
  readdirSync(builtinsDirectory).find(name => name.startsWith("libcompiler_builtins-")));

const compiler = join(generated, "mqjs");
const stdlibCompiler = join(generated, "mqjs-stdlib");
execFileSync(process.env.CC || "cc", ["-Os", `-I${engine}`,
  join(engine, "mqjs_stdlib.c"), join(engine, "mquickjs_build.c"),
  "-o", stdlibCompiler], { stdio: "inherit" });
writeFileSync(join(generated, "mqjs_stdlib.h"), execFileSync(stdlibCompiler));
writeFileSync(join(generated, "mquickjs_atom.h"), execFileSync(stdlibCompiler, ["-a"]));
const wasmHeaders = join(generated, "wasm32");
mkdirSync(wasmHeaders, { recursive: true });
writeFileSync(join(wasmHeaders, "mqjs_stdlib.h"), execFileSync(stdlibCompiler, ["-m32"]));
writeFileSync(join(wasmHeaders, "mquickjs_atom.h"), execFileSync(stdlibCompiler, ["-m32", "-a"]));
writeFileSync(join(generated, "mqjs-host.c"), readFileSync(join(engine, "mqjs.c"), "utf8")
  .replace('#include "mqjs_stdlib.h"', '#include "mqjs_stdlib.h"'));
execFileSync(process.env.CC || "cc", ["-Os", `-I${engine}`,
  `-I${generated}`, join(generated, "mqjs-host.c"),
  join(engine, "readline.c"), join(engine, "readline_tty.c"),
  join(engine, "mquickjs.c"), join(engine, "dtoa.c"), join(engine, "libm.c"),
  join(engine, "cutils.c"), "-lm", "-o", compiler], { stdio: "inherit" });
const sourceParts = [...runtimeSources, ...applicationSources];
const guestSource = sourceParts.map((file, index) => {
  const source = readFileSync(file, "utf8");
  if (/^\s*(?:import|export)\s/m.test(source)) {
    throw new Error(`MicroQuickJS guest slice must not use modules: ${file}`);
  }
  const kind = index < runtimeSources.length ? "runtime" : "application";
  const label = relative(sourceRoot, file).replaceAll("\\", "/");
  return `/* guest ${kind}: ${label} */\n${source.trim()}\n;\n`;
}).join("\n");
const guestOutput = join(generated, "application.guest.js");
const bytecode = join(generated, "application.bin");
writeFileSync(guestOutput, guestSource);
rmSync(bytecode, { force: true });
execFileSync(compiler, ["-m32", "-o", bytecode, guestOutput], { stdio: "inherit" });
const bytes = readFileSync(bytecode);
if (!bytes.length) throw new Error("MicroQuickJS compiler produced empty bytecode");
if (!Number.isSafeInteger(chunkBytes) || chunkBytes < 1024) {
  throw new Error("--chunk-bytes must be an integer of at least 1024");
}
for (const name of readdirSync(bytecodeDirectory)) {
  if (name.endsWith(".bin")) rmSync(join(bytecodeDirectory, name));
}
const chunks = [];
for (let offset = 0, index = 0; offset < bytes.length; offset += chunkBytes, index++) {
  const name = `${String(index).padStart(2, "0")}.bin`;
  writeFileSync(join(bytecodeDirectory, name), bytes.subarray(offset, offset + chunkBytes));
  chunks.push(name);
}
writeFileSync(join(bytecodeDirectory, "manifest.json"),
  `${JSON.stringify({ format: "microquickjs-bytecode-v1", bytes: bytes.length, chunks }, null, 2)}\n`);

const clang = [
  "--target=wasm32-wasi", "-Os", "-mllvm", "-wasm-enable-sjlj",
  "-nostdlib", "-nostdlibinc", "-Wl,--no-entry", `-I${libcPonyfill}`,
  `-I${wasmHeaders}`, `-I${engine}`, `-I${generated}`,
  "-Wl,--export=onmsg", "-Wl,--export-memory", "-Wl,--strip-all",
  join(engine, "mquickjs.c"), join(engine, "dtoa.c"), join(engine, "libm.c"),
  join(engine, "cutils.c"), join(here, "server.c"),
  "/usr/wasm32-wasi/lib/wasm32-wasi/libsetjmp.a", builtins,
  "-o", output,
];
execFileSync("clang", clang, { stdio: "inherit" });
