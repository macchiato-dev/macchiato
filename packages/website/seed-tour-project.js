#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createNodeSqliteClient } from "./adapters/node-sqlite-client.js";
import { createContentStore } from "@macchiato-dev/hub/content";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

const username = option("--username", "benatkin");
const dataDir = option("--data-dir", join(homedir(), ".macchiato", "default"));
const sourceDir = option("--source-dir", "/root/dom-use-tour");
const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
const client = createNodeSqliteClient(db);
const users = await client.execute({
  sql: "SELECT id, username FROM users WHERE username = ? COLLATE NOCASE",
  args: [username],
});
if (!users.rows[0]) throw new Error(`Resources user not found: ${username}`);

if (!existsSync(join(sourceDir, "index.html"))) throw new Error(`Tour source not found: ${sourceDir}`);
const textFiles = ["index.html", "style.css", "app.js", "generated/tour-data.js", "README.md"];
const files = textFiles.filter((path) => existsSync(join(sourceDir, path))).map((path) => ({
  path,
  content: readFileSync(join(sourceDir, path), "utf8"),
}));
const offlinePresentation = join(sourceDir, "dist", "offline", "index.html");
if (existsSync(offlinePresentation)) files.push({ path: "presentation.html", content: readFileSync(offlinePresentation, "utf8") });
const illustrationDir = join(sourceDir, "assets", "illustrations");
if (existsSync(illustrationDir)) {
  for (const name of readdirSync(illustrationDir).sort()) {
    if (!/\.(?:jpe?g|png|gif|webp)$/i.test(name)) continue;
    const extension = name.split(".").at(-1).toLowerCase();
    const mime = extension === "jpg" || extension === "jpeg" ? "image/jpeg" : `image/${extension}`;
    files.push({ path: `assets/illustrations/${name}`, content: `data:${mime};base64,${readFileSync(join(illustrationDir, name)).toString("base64")}` });
  }
}

const html = files.find((file) => file.path === "index.html").content;
const appSource = files.find((file) => file.path === "app.js").content;
const css = files.find((file) => file.path === "style.css").content;
const tags = [...new Set(["h2", "h3", "h4", ...[...`${html}\n${appSource}`.matchAll(/<\/?([a-z][a-z0-9-]*)\b/gi)].map((match) => match[1].toLowerCase())])]
  .filter((tag) => !["html", "head", "meta", "link", "script", "style", "title"].includes(tag));
const attributes = ["id", "class", "hidden", "title", "role", "type", "value", "accept", "alt", "src", "method", "open", "maxlength", "placeholder", "viewBox", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "cx", "cy", "r", "rx", "ry", "d", "points", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "aria-*", "data-*"];
const events = ["click", "input", "change", "keydown", "visibilitychange", "blur", "focus", "pagehide"];
const domSchema = {
  nodes: Object.fromEntries(["body", ...tags].map((tag) => [tag, { attrs: attributes, events, children: [...tags, "#text"] }])),
  urls: { "img.src": "^(?:assets/illustrations/[a-z0-9-]+\\.(?:jpg|jpeg|png|gif|webp)|data:image/(?:jpeg|png|gif|webp);base64,[A-Za-z0-9+/=]+)$", fragments: true },
  maxDepth: 40,
  limits: { maxTextLength: 250_000, maxAttributeNameLength: 80, maxAttributeValueLength: 250_000, maxAttributes: 24, maxNodes: 3_000 },
  gas: { enabled: true, tank: { init: 1_000_000, idle: 240_000, event: 220_000 }, refill: 30_000 },
};
const properties = Object.fromEntries([...css.matchAll(/([a-zA-Z-]+)\s*:\s*([^;}{]+)[;}]/g)].map((match) => [match[1].toLowerCase(), true]));
properties["stroke-dashoffset"] = true;
const cssSchema = { properties, imports: false, limits: { maxStylesheetLength: 100_000, maxPropertyLength: 128, maxValueLength: 8_192, maxUrlLength: 4_096, maxImports: 0 } };

const snapshot = {
  files,
  config: {
    entry: "index.html",
    containerEntry: "presentation.html",
    template: "slides",
    container: "presentation",
    artifactPath: "/-/blog-examples/dom-use-tour/index.html",
    stylesheets: ["style.css"],
    scripts: ["app.js"],
    editorTabs: ["index.html", "style.css", "app.js"],
    modules: { "./generated/tour-data.js": "generated/tour-data.js" },
    domSchema,
    cssSchema,
    capabilities: { events, sessionStorage: true, storageLimit: 2_000_000 },
    limits: { memoryBytes: 128 * 1024 * 1024, stackBytes: 2 * 1024 * 1024 },
    sandbox: { network: false, storage: "session" },
  },
};

const store = createContentStore(client);
const existing = await store.getProject(username, "dom-use-tour", users.rows[0].id);
if (existing) {
  await store.saveProjectSnapshot(users.rows[0].id, existing.id, snapshot, { reason: "manual", destructive: true });
  await store.publishProject(users.rows[0].id, existing.id);
  console.log(`Updated /${username}/dom-use-tour`);
} else {
  await store.createProject(users.rows[0].id, {
    namespace: "user",
    userSlug: username,
    slug: "dom-use-tour",
    name: "DOM use code tour",
    description: "A generated, source-complete presentation of the dom-use package.",
    visibility: "public",
    template: "slides",
    snapshot,
  });
  console.log(`Created /${username}/dom-use-tour`);
}

db.close();
