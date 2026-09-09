import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath, [join(here, "build-resources-policy-catalog.js")],
  { stdio: "inherit" });
execFileSync(process.execPath, [join(here, "build-resources-document-guest.js")],
  { stdio: "inherit" });
execFileSync(process.execPath, [join(here, "build-resources-application-guest.js")],
  { stdio: "inherit" });
execFileSync(process.execPath, [
  join(here, "../wwm-js-runtimes/quickjs-server/build.js"),
  "--application", join(here, "generated/resources-application.js"),
  "--output-dir", join(here, "generated/resources-application-machine"),
], { stdio: "inherit" });
execFileSync(process.execPath, [
  join(here, "../wwm-js-runtimes/microquickjs-server/build.js"),
  "--source-root", here,
  "--runtime", join(here, "guest-runtime/http.js"),
  "--application", join(here, "resources-server-guest.js"),
  "--output", join(here, "generated/microquickjs-server.wasm"),
  "--bytecode-dir", join(here, "generated/resources-server-bytecode"),
], { stdio: "inherit" });
execFileSync(process.execPath, [
  join(here, "../wwm-js-runtimes/microquickjs-server/build.js"),
  "--source-root", here,
  "--application", join(here, "generated/resources-document-renderer.js"),
  "--application", join(here, "resources-document-guest.js"),
  "--output", join(here, "generated/microquickjs-server.wasm"),
  "--bytecode-dir", join(here, "generated/resources-document-bytecode"),
], { stdio: "inherit" });
// SQL values can contain whole projects. Reuse the growable QuickJS runtime
// rather than copying them through the routing runtime's fixed 1 MiB buffer.
writeFileSync(join(here, "generated/resources-policy.js"), [
  "generated/resources-policy-catalog.js", "resources-policy-guest.js",
  "resources-policy-async.js",
].map(name => readFileSync(join(here, name), "utf8")).join("\n"));
execFileSync(process.execPath, [
  join(here, "../wwm-js-runtimes/quickjs-server/build.js"),
  "--application", join(here, "generated/resources-policy.js"),
  "--output-dir", join(here, "generated/resources-policy-machine"),
], { stdio: "inherit" });
execFileSync(process.execPath, [
  join(here, "../wwm-js-runtimes/microquickjs-server/build.js"),
  "--source-root", here,
  "--application", join(here, "resources-project-version-guest.js"),
  "--output", join(here, "generated/microquickjs-server.wasm"),
  "--bytecode-dir", join(here, "generated/resources-project-version-bytecode"),
], { stdio: "inherit" });
