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
const firstEnd = source.indexOf("async function csrfToken(");
const secondStart = source.indexOf("function dashboardHtml(");
const secondEnd = source.indexOf("export function createResourcesEdgeHandler");
if (start < 0 || firstEnd <= start || secondStart < firstEnd || secondEnd <= secondStart) {
  throw new Error("Resources document renderer slices were not found");
}

const inputs = [
  `var ACCOUNT_CONTENT_MARKER = ${JSON.stringify("<p>__RESOURCES_ACCOUNT_CONTENT__</p>")};`,
  `var PUBLIC_PROJECTS_MARKER = ${JSON.stringify("<p>__RESOURCES_PUBLIC_PROJECTS__</p>")};`,
  `var resourcesAppearanceHtml = ${JSON.stringify(resourcesAppearanceHtml)};`,
  `var resourcesBellIconHtml = ${JSON.stringify(resourcesBellIconHtml)};`,
  `var resourcesBlankAvatarHtml = ${JSON.stringify(resourcesBlankAvatarHtml)};`,
  `var resourcesCreateIconHtml = ${JSON.stringify(resourcesCreateIconHtml)};`,
  `function renderResourcesCommandPalette() { return ${JSON.stringify(renderResourcesCommandPalette())}; }`,
  source.slice(start, firstEnd),
  source.slice(secondStart, secondEnd).replace(/^export /gm, ""),
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
