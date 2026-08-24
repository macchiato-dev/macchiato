import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../dev/wasm-web-runtimes/quickjs");
const generated = join(here, "generated");
const application = process.argv[2] || join(here, "application.js");
mkdirSync(generated, { recursive: true });
const source = [join(here, "runtime.js"), application]
  .map(path => readFileSync(path, "utf8").trim()).join("\n\n") + "\n";
writeFileSync(join(generated, "application.js"), source);

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
writeFileSync(join(generated, "application.bin"), source);
