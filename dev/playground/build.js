import { build } from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const workspace = join(directory, "..", "..");
const dist = join(directory, "dist");
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await build({
  entryPoints: [join(directory, "src", "browser-controller.js")],
  outfile: join(dist, "browser-controller.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  sourcemap: true,
});
await build({
  entryPoints: [join(directory, "src", "controller.ts")],
  outfile: join(dist, "controller.js"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "esnext",
});
for (const name of ["project-editor-quickjs-runtime.wasm", "project-quickjs-runtime.wasm"]) {
  await copyFile(join(workspace, "packages", "website", "generated", name), join(dist, name));
}
