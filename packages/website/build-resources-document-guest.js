import { transformSync } from "@babel/core";
import presetEnv from "@babel/preset-env";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderResourcesCommandPalette,
  resourcesAppearanceHtml,
  resourcesBellIconHtml,
  resourcesBlankAvatarHtml,
  resourcesCreateIconHtml,
} from "./components/user-menu.js";

const here = dirname(fileURLToPath(import.meta.url));
const source = await readFile(join(here, "edge/app.js"), "utf8");
const start = source.indexOf("function escapeHtml(");
const end = source.indexOf("function projectRoute(");
if (start < 0 || end <= start) throw new Error("Resources document renderer slice was not found");

const inputs = [
  `var resourcesAppearanceHtml = ${JSON.stringify(resourcesAppearanceHtml)};`,
  `var resourcesBellIconHtml = ${JSON.stringify(resourcesBellIconHtml)};`,
  `var resourcesBlankAvatarHtml = ${JSON.stringify(resourcesBlankAvatarHtml)};`,
  `var resourcesCreateIconHtml = ${JSON.stringify(resourcesCreateIconHtml)};`,
  `function renderResourcesCommandPalette() { return ${JSON.stringify(renderResourcesCommandPalette())}; }`,
  source.slice(start, end),
].join("\n");
const transformed = transformSync(inputs, {
  babelrc: false,
  configFile: false,
  comments: true,
  compact: false,
  presets: [[presetEnv, { modules: false, targets: { ie: "11" } }]],
  sourceType: "script",
});
if (!transformed?.code) throw new Error("Resources document renderer was not compiled");
await writeFile(join(here, "generated/resources-document-renderer.js"), `${transformed.code}\n`);
