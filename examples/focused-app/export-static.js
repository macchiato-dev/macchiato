import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { quickJsEmscriptenSandboxBrowserAssets } from "@macchiato-dev/quickjs-emscripten-sandbox/browser-assets";

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../..");
const destination = resolve(process.argv[2] || join(root, "dist/focused-app"));
await mkdir(destination, { recursive: true });
for (const file of ["index.html", "client.js", "model.js", "preview-runtime.js", "style.css"]) {
  await cp(join(directory, file), join(destination, file));
}
await cp(join(root, "packages/browser-use/src/index.js"), join(destination, "browser-use-host.js"));
await cp(join(root, "packages/browser-use/src/quickjs-dom-guest.js"), join(destination, "browser-use-quickjs-dom-guest.js"));
const assetDirectory = join(destination, "-/quickjs-emscripten-sandbox");
await mkdir(assetDirectory, { recursive: true });
for (const asset of quickJsEmscriptenSandboxBrowserAssets.files) {
  let source = await readFile(asset.filePath, "utf8");
  for (const [from, to] of Object.entries(asset.rewrites || {})) source = source.replaceAll(from, to);
  source = source.replace(/\/\/# sourceMappingURL=.*$/m, "");
  await writeFile(join(assetDirectory, asset.publicPath), source);
}
console.log(destination);
