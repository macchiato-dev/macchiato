#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createNodeSqliteClient } from "./adapters/node-sqlite-client.js";
import { createContentStore } from "./models/content.js";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

const username = option("--username", "benatkin");
const dataDir = option("--data-dir", join(homedir(), ".macchiato", "default"));
const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
const client = createNodeSqliteClient(db);
const users = await client.execute({
  sql: "SELECT id, username FROM users WHERE username = ? COLLATE NOCASE",
  args: [username],
});
if (!users.rows[0]) throw new Error(`Resources user not found: ${username}`);

const snapshot = {
  files: [{
    path: "README.md",
    content: "# DOM use code tour\n\nA generated, source-complete presentation of the `dom-use` package. The published presentation is loaded by the presentation container from the configured blog-examples origin.",
  }, {
    path: "index.html",
    content: "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>DOM use code tour</title></head><body></body></html>",
  }],
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
