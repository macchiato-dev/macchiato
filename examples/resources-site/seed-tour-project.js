#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createNodeSqliteClient } from "./adapters/node-sqlite-client.js";
import { createContentStore } from "./models/content.js";

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
const illustrationDir = join(sourceDir, "assets", "illustrations");
if (existsSync(illustrationDir)) {
  for (const name of readdirSync(illustrationDir).sort()) {
    if (!/\.(?:jpe?g|png|gif|webp)$/i.test(name)) continue;
    const extension = name.split(".").at(-1).toLowerCase();
    const mime = extension === "jpg" || extension === "jpeg" ? "image/jpeg" : `image/${extension}`;
    files.push({ path: `assets/illustrations/${name}`, content: `data:${mime};base64,${readFileSync(join(illustrationDir, name)).toString("base64")}` });
  }
}

const snapshot = {
  files,
  config: {
    entry: "index.html",
    template: "slides",
    container: "presentation",
    artifactPath: "/-/blog-examples/dom-use-tour/index.html",
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
