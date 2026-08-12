#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createNodeSqliteClient } from "./adapters/node-sqlite-client.js";
import { createContentStore } from "@macchiato-dev/hub/content";

function option(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

function extractTags(source) {
  return [...new Set([...source.matchAll(/<\/?([a-z][a-z0-9-]*)\b/gi)].map((match) => match[1].toLowerCase()))]
    .filter((tag) => !["html", "head", "meta", "title", "style", "script"].includes(tag));
}

function extractCssProperties(source) {
  const css = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("\n");
  const declarations = [...css.matchAll(/(?:^|[;{])\s*(--[a-z0-9-]+|[a-z-]+)\s*:/gim)].map((match) => match[1].toLowerCase());
  const inlineCustomProperties = [...source.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((match) => match[1].toLowerCase());
  return Object.fromEntries([...declarations, ...inlineCustomProperties].map((property) => [property, true]));
}

export function singleFileSnapshot(source, { fetchResources = [] } = {}) {
  const tags = extractTags(source);
  const children = [...tags, "#text"];
  const attributes = [
    "id", "class", "style", "title", "role", "type", "tabindex", "hidden", "disabled", "src", "alt", "viewBox", "xmlns",
    "d", "fill", "opacity", "cx", "cy", "rx", "ry", "r", "stroke", "stroke-width",
    "stroke-linecap", "x1", "y1", "x2", "y2", "aria-*", "data-*",
  ];
  const events = ["click", "keydown"];
  return {
    files: [{ path: "index.html", content: source }],
    config: {
      entry: "index.html",
      template: "html",
      container: "single-file-web-app",
      containers: {
        runtime: { name: "single-file-html-runtime", input: "index.html", scripts: "quickjs" },
        display: { name: "single-file-web-surface", dom: "dom-use", css: "style-use" },
      },
      domSchema: {
        nodes: Object.fromEntries(["body", ...tags].map((tag) => [tag, { attrs: attributes, events, children }])),
        urls: { fragments: true, ...(fetchResources.length ? { "img.src": "^(?:macchiato-resource:[0-9]+|data:image/(?:png|jpeg|gif|webp|svg\\+xml);base64,[A-Za-z0-9+/=]+)$" } : {}) },
        maxDepth: 24,
        limits: {
          maxTextLength: 100_000,
          maxAttributeNameLength: 80,
          maxAttributeValueLength: 16_384,
          ...(fetchResources.length ? { maxAttributeValueLengths: { "img.src": 1_500_000 } } : {}),
          maxAttributes: 32,
          maxNodes: 1_000,
        },
        gas: { enabled: true, tank: { init: 1_000_000, idle: 240_000, event: 240_000 }, refill: 30_000 },
      },
      cssSchema: {
        properties: extractCssProperties(source),
        urls: { "background-image": { pattern: "^data:image/svg\\+xml," } },
        imports: false,
        limits: { maxStylesheetLength: 150_000, maxPropertyLength: 128, maxValueLength: 16_384, maxUrlLength: 1024, maxImports: 0 },
      },
      capabilities: {
        events, timerResolution: 50, documentSurface: true, scroll: "vertical",
        ...(fetchResources.length ? { fetch: { resources: fetchResources, limits: { maxFiles: 10, maxUrlLength: 100, maxFileBytes: 1024 * 1024, maxTotalBytes: 4 * 1024 * 1024 } } } : {}),
      },
      limits: { memoryBytes: 64 * 1024 * 1024, stackBytes: 1024 * 1024 },
      sandbox: { network: false, storage: "memory" },
    },
  };
}

async function main() {
  const sourcePath = option("--source");
  const source = process.argv.includes("--stdin") ? readFileSync(0, "utf8") : sourcePath ? readFileSync(sourcePath, "utf8") : "";
  if (!source.trim()) throw new Error("Pass raw HTML with --source <file> or --stdin");
  const username = option("--username", "benatkin");
  const slug = option("--slug");
  const name = option("--name");
  if (!slug || !name) throw new Error("--slug and --name are required");
  const dataDir = option("--data-dir", join(homedir(), ".macchiato", "default"));
  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  try {
    const client = createNodeSqliteClient(db);
    const users = await client.execute({ sql: "SELECT id FROM users WHERE username = ? COLLATE NOCASE", args: [username] });
    if (!users.rows[0]) throw new Error(`Resources user not found: ${username}`);
    const store = createContentStore(client);
    const fetchResources = process.argv.flatMap((value, index) => value === "--fetch-url" ? [process.argv[index + 1]] : []);
    const snapshot = singleFileSnapshot(source, { fetchResources });
    const existing = await store.getProject(username, slug, users.rows[0].id);
    if (existing) {
      await store.updateProject(users.rows[0].id, existing.id, {
        namespace: "user", userSlug: username, slug, name,
        description: option("--description", "A self-contained HTML, CSS, and JavaScript project."),
        visibility: "public", template: "html",
      });
      await store.saveProjectSnapshot(users.rows[0].id, existing.id, snapshot, { reason: "manual", destructive: true });
      await store.publishProject(users.rows[0].id, existing.id);
      console.log(`Updated /${username}/${slug}`);
    } else {
      await store.createProject(users.rows[0].id, {
        namespace: "user", userSlug: username, slug, name,
        description: option("--description", "A self-contained HTML, CSS, and JavaScript project."),
        visibility: "public", template: "html", snapshot,
      });
      console.log(`Created /${username}/${slug}`);
    }
  } finally {
    db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
