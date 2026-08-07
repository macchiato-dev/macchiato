import { build } from "esbuild";
import { transformFileAsync } from "@babel/core";
import { writeFile } from "node:fs/promises";

const guestEntry = new URL("../src/guest-runtime.ts", import.meta.url);
await build({
  entryPoints: [guestEntry.pathname],
  outfile: new URL("../lib/guest-runtime.js", import.meta.url).pathname,
  bundle: false,
  format: "iife",
  platform: "neutral",
  target: "es2022",
  sourcemap: true,
  logLevel: "warning",
});

await build({
  entryPoints: [new URL("../src/host.ts", import.meta.url).pathname],
  outfile: new URL("../lib/host.js", import.meta.url).pathname,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  sourcemap: true,
  logLevel: "warning",
});

const microMap = `"use strict";
(function () {
  if (typeof Map === "function") return;
  function SmallMap() { this.keys = []; this.values = []; }
  SmallMap.prototype.get = function (key) { var index = this.keys.indexOf(key); return index < 0 ? undefined : this.values[index]; };
  SmallMap.prototype.set = function (key, value) { var index = this.keys.indexOf(key); if (index < 0) { this.keys.push(key); this.values.push(value); } else { this.values[index] = value; } return this; };
  SmallMap.prototype.clear = function () { this.keys.length = 0; this.values.length = 0; };
  globalThis.Map = SmallMap;
})();
`;
const microOutputUrl = new URL("../lib/guest-runtime-microquickjs.js", import.meta.url);
const microOutput = await transformFileAsync(guestEntry.pathname, {
  configFile: new URL("../babel.microquickjs.json", import.meta.url).pathname,
});
await writeFile(microOutputUrl, `${microMap}${microOutput.code}\n`);
