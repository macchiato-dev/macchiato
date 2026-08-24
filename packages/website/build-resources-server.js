import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath, [join(here, "build-resources-policy-catalog.js")],
  { stdio: "inherit" });
execFileSync(process.execPath, [join(here, "build-resources-document-guest.js")],
  { stdio: "inherit" });
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
execFileSync(process.execPath, [
  join(here, "../wwm-js-runtimes/microquickjs-server/build.js"),
  "--source-root", here,
  "--application", join(here, "generated/resources-policy-catalog.js"),
  "--application", join(here, "resources-policy-guest.js"),
  "--output", join(here, "generated/microquickjs-server.wasm"),
  "--bytecode-dir", join(here, "generated/resources-policy-bytecode"),
], { stdio: "inherit" });
execFileSync(process.execPath, [
  join(here, "../wwm-js-runtimes/microquickjs-server/build.js"),
  "--source-root", here,
  "--application", join(here, "resources-project-version-guest.js"),
  "--output", join(here, "generated/microquickjs-server.wasm"),
  "--bytecode-dir", join(here, "generated/resources-project-version-bytecode"),
], { stdio: "inherit" });
