import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../dev/wasm-web-runtimes/quickjs");
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
// Cargo runs in the runtime directory, so its environment needs absolute
// paths even when the build command was given repository-relative arguments.
const generated = resolve(option("--output-dir", join(here, "generated")));
const application = resolve(option("--application", join(here, "application.js")));
mkdirSync(generated, { recursive: true });
const source = [join(here, "runtime.js"), application]
  .map(path => readFileSync(path, "utf8").trim()).join("\n\n") + "\n";
writeFileSync(join(generated, "application.js"), source);

const compiler = join(generated, "quickjs-compile");
execFileSync(process.env.CC || "cc", ["-O0", "-DCONFIG_VERSION=\"2026-06-04\"",
  `-I${join(root, "quickjs")}`,
  join(here, "compiler.c"), join(root, "quickjs/quickjs.c"),
  join(root, "quickjs/dtoa.c"), join(root, "quickjs/libregexp.c"),
  join(root, "quickjs/libunicode.c"), join(root, "quickjs/cutils.c"),
  "-lm", "-o", compiler], { stdio: "inherit" });

const environment = { ...process.env,
  WWC_SERVER_GUEST: join(here, "server.c"),
  WWC_APPLICATION_SOURCE: join(generated, "empty.js"),
  WWC_GUEST_ENVIRONMENT: join(generated, "empty.js") };
writeFileSync(join(generated, "empty.js"), "");
execFileSync(process.env.CARGO || join(process.env.HOME, ".cargo/bin/cargo"),
  ["build", "--release", "--target",
  "wasm32-unknown-unknown"], { cwd: root, env: environment, stdio: "inherit" });
const wasm = readFileSync(join(root,
  "target/wasm32-unknown-unknown/release/wasm_web_container_quickjs_runtime.wasm"));
writeFileSync(join(generated, "quickjs-server.wasm"), wasm);
execFileSync(compiler, [join(generated, "application.js"),
  join(generated, "application.bin")], { stdio: "inherit" });
