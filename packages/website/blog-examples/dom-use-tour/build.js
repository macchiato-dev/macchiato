import { copyFile, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve(process.env.DOM_USE_TOUR_EXPORT || "/root/dom-use-tour/dist/offline/index.html");
const output = resolve("dist/index.html");
const info = await stat(source).catch(() => null);
if (!info?.isFile()) throw new Error(`Missing exported tour at ${source}. Run \`npm run export:offline\` in the dom-use-tour project first.`);
await mkdir(resolve("dist"), { recursive: true });
await copyFile(source, output);
console.log(`Copied ${(info.size / 1_048_576).toFixed(2)} MiB exported presentation`);
