import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(directory, "generated");
const guest = await build({
  entryPoints: [join(directory, "../../packages/code-editor-use/src/guest.js")],
  bundle: true,
  format: "iife",
  platform: "neutral",
  write: false,
}).then((result) => result.outputFiles[0].text);
const runtime = await build({
  entryPoints: [join(directory, "project-editor-runtime.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  write: false,
}).then((result) => result.outputFiles[0].text);
const guestRuntime = await readFile(join(directory, "../../packages/dom-use/lib/guest-runtime.js"), "utf8");
const presentationRunner = await build({
  entryPoints: [join(directory, "../../packages/presentation-use/src/runner.js")],
  bundle: true,
  format: "iife",
  platform: "browser",
  define: { __PRESENTATION_USE_GUEST_RUNTIME__: JSON.stringify(guestRuntime) },
  write: false,
}).then((result) => result.outputFiles[0].text);
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "project-editor-runtime.js"), runtime);
await writeFile(join(outputDirectory, "project-editor-guest.js"), guest);
await writeFile(join(outputDirectory, "presentation-runner.js"), presentationRunner);
