import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(packageRoot, "guest/quickjs-dom-environment.js");
const adapterPath = resolve(packageRoot, "src/quickjs-dom-guest.js");
const mode = process.argv[2] || "--check";

function render(source) {
  return `// Generated from ../guest/quickjs-dom-environment.js by scripts/sync-quickjs-dom-guest.js.\nexport const browserUseQuickJsDomGuestSource = ${JSON.stringify(source)};\n`;
}

if (mode === "--extract") {
  const adapter = await readFile(adapterPath, "utf8");
  const match = adapter.match(/^export const browserUseQuickJsDomGuestSource = `\n([\s\S]*)\n`;\s*$/);
  if (!match) throw new Error("Existing guest adapter is not the expected template literal");
  await mkdir(dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, `${match[1]}\n`);
  await writeFile(adapterPath, render(`${match[1]}\n`));
  console.log(`Extracted ${sourcePath}`);
} else {
  const source = await readFile(sourcePath, "utf8");
  const expected = render(source);
  if (mode === "--write") {
    await writeFile(adapterPath, expected);
    console.log(`Updated ${adapterPath}`);
  } else if (mode === "--check") {
    const actual = await readFile(adapterPath, "utf8");
    if (actual !== expected) {
      console.error("quickjs-dom-guest.js is stale; run npm run build:guest -w @macchiato-dev/browser-use");
      process.exitCode = 1;
    }
  } else {
    throw new Error("Usage: sync-quickjs-dom-guest.js --check|--write");
  }
}
