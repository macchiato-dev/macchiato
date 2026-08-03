import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const packs = mkdtempSync(join(tmpdir(), "macchiato-packs-"));
const consumer = mkdtempSync(join(tmpdir(), "macchiato-consumer-"));
const workspaces = [
  "@macchiato-dev/style-use",
  "@macchiato-dev/html-use",
  "@macchiato-dev/dom-use",
];

const smokeTest = String.raw`
const expected = new Map([
  ["@macchiato-dev/style-use", "StyleUse"],
  ["@macchiato-dev/style-use/browser-assets", "styleUseBrowserAssets"],
  ["@macchiato-dev/html-use", "sanitizeHTML"],
  ["@macchiato-dev/html-use/browser-assets", "htmlUseBrowserAssets"],
  ["@macchiato-dev/dom-use", "DomUse"],
  ["@macchiato-dev/dom-use/bridge", "DomUseHostCapability"],
  ["@macchiato-dev/dom-use/browser-assets", "domUseBrowserAssets"],
]);
for (const [name, symbol] of expected) {
  const loaded = await import(name);
  if (!(symbol in loaded)) throw new Error(name + " is missing " + symbol);
}
await import("@macchiato-dev/dom-use/guest-runtime");
if (typeof globalThis.__macchiatoDispatch !== "function") {
  throw new Error("dom-use guest runtime did not install its dispatch boundary");
}
`;

try {
  for (const workspace of workspaces) {
    execFileSync("npm", ["pack", "--silent", "--pack-destination", packs, "--workspace", workspace], { cwd: root, stdio: "inherit" });
  }
  execFileSync("npm", ["init", "--yes"], { cwd: consumer, stdio: "ignore" });
  const tarballs = readdirSync(packs).filter((name) => name.endsWith(".tgz")).map((name) => join(packs, name));
  execFileSync("npm", ["install", "--silent", ...tarballs], { cwd: consumer, stdio: "inherit" });
  execFileSync(process.execPath, ["--input-type=module", "--eval", smokeTest], { cwd: consumer, stdio: "inherit" });
  console.log("Core publish tarballs install and import cleanly without workspace hoisting.");
} finally {
  rmSync(packs, { recursive: true, force: true });
  rmSync(consumer, { recursive: true, force: true });
}
