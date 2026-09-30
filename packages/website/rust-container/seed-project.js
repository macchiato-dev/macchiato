// Reuse the existing Node/SQLite project store; the compiler service is Deno.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { createNodeSqliteClient } from "../adapters/node-sqlite-client.js";
import { createContentStore } from "../../hub/src/content.js";

const root = new URL("./", import.meta.url);
const db = new DatabaseSync(`${homedir()}/.macchiato/default/macchiato.sqlite3`);
try {
  const user = db.prepare("SELECT id FROM users WHERE username = ?").get("benatkin");
  if (!user) throw new Error("The benatkin account is unavailable");
  const store = createContentStore(createNodeSqliteClient(db));
  if (await store.getProject("benatkin", "rust-mahjong", user.id)) {
    throw new Error("rust-mahjong already exists; not overwriting project edits");
  }
  const snapshot = {
    files: ["mahjong.rs", "guest-api.rs"].map(path => ({
      path, content: readFileSync(new URL(path, root), "utf8"),
    })).concat({ path: "tiles.png", content: "data:image/png;base64," +
      readFileSync(new URL("../../../examples/mahjong/tiles/ExampleRegular.png", root)).toString("base64") },
      { path: "bonus.png", content: "data:image/png;base64," +
        readFileSync(new URL("bonus.png", root)).toString("base64") }),
    config: { entry: "mahjong.rs", runtime: "rust", template: "html",
      output: { iframe: true } },
  };
  await store.createProject(user.id, {
    namespace: "user", userSlug: "benatkin", slug: "rust-mahjong",
    name: "Rust Mahjong", description: "Mahjong in two Rust WebAssembly machines. Work in progress.",
    visibility: "public", template: "html", snapshot,
  });
  const project = await store.getProject("benatkin", "rust-mahjong", user.id);
  if (!project) throw new Error("New project could not be read");
  const compiled = { tree: [], document: {}, scripts: [], stylesheets: [],
    runtime: { kind: "rust", wasm: readFileSync(new URL("dist/mahjong.wasm", root)).toString("base64") } };
  const saved = await store.saveProjectBuildOutput(user.id, project.id, snapshot, {
    format: "resources-project-output-v1", project: snapshot, compiled,
  });
  if (!saved?.saved) throw new Error("Initial compiled output was not stored");
  console.log("Created http://resources-edge.localhost:3030/benatkin/rust-mahjong");
} finally { db.close(); }
