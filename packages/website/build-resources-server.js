import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath, [
  join(here, "../wwm-js-runtimes/microquickjs-server/build.js"),
  "--source-root", here,
  "--runtime", join(here, "guest-runtime/http.js"),
  "--application", join(here, "resources-server-guest.js"),
  "--output", join(here, "generated/resources-server-microquickjs.wasm"),
  "--guest-output", join(here, "generated/resources-server-guest.js"),
], { stdio: "inherit" });
execFileSync(process.execPath, [
  join(here, "../wwm-js-runtimes/microquickjs-server/build.js"),
  "--source-root", here,
  "--application", join(here, "resources-project-version-guest.js"),
  "--output", join(here, "generated/resources-project-version-microquickjs.wasm"),
  "--guest-output", join(here, "generated/resources-project-version-guest.js"),
], { stdio: "inherit" });
