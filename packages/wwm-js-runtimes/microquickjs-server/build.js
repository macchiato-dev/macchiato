import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const engine = join(here, "vendor/microquickjs");
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
const guestOutput = option("--guest-output", output.replace(/\.wasm$/, ".guest.js"));
const sourceRoot = option("--source-root", process.cwd());
mkdirSync(generated, { recursive: true });
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
const bytecode = join(generated, "application.bin");
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
writeFileSync(guestOutput, guestSource);
// MicroQuickJS's compiler currently reports some source errors without a
// failing process status. Remove the previous output so an unsuccessful
// compile cannot silently reuse stale bytecode.
rmSync(bytecode, { force: true });
execFileSync(compiler, ["-m32", "-o", bytecode, guestOutput],
  { stdio: "inherit" });

const bytes = readFileSync(bytecode);
const rows = [];
for (let offset = 0; offset < bytes.length; offset += 12) {
  rows.push(`  ${[...bytes.subarray(offset, offset + 12)].join(", ")}`);
}
writeFileSync(join(generated, "application.h"),
  `static uint8_t application_bytecode[] = {\n${rows.join(",\n")}\n};\n`);

const clang = [
  "--target=wasm32-wasi", "--sysroot=/usr/wasm32-wasi", "-Os",
  "-mllvm", "-wasm-enable-sjlj", "-nostdlib", "-Wl,--no-entry",
  `-I${wasmHeaders}`, `-I${engine}`, `-I${generated}`,
  "-Wl,--export=onmsg", "-Wl,--export-memory", "-Wl,--strip-all",
  join(engine, "mquickjs.c"), join(engine, "dtoa.c"), join(engine, "libm.c"),
  join(engine, "cutils.c"), join(here, "server.c"),
  "/usr/wasm32-wasi/lib/wasm32-wasi/libc.a",
  "/usr/wasm32-wasi/lib/wasm32-wasi/libsetjmp.a", builtins,
  "-o", output,
];
execFileSync("clang", clang, { stdio: "inherit" });
