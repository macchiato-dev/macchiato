import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createHttpUseHandler } from "@macchiato-dev/http-use/backend";

const databaseName = globalThis.__HTTP_USE_DATABASE || "./notes.sqlite3";
const port = Number(globalThis.__HTTP_USE_PORT || 8787);
const database = new DatabaseSync(databaseName);

database.exec(`CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  internal_token TEXT NOT NULL DEFAULT 'server-only'
)`);

const noteSchema = {
  type: "object",
  required: ["id", "title", "done"],
  properties: {
    id: { type: "integer" },
    title: { type: "string" },
    done: { type: "boolean" },
  },
};
const idSchema = { type: "integer" };
const titleSchema = { type: "string" };
const boolSchema = { type: "boolean" };

function publicNote(row) {
  return row && { ...row, done: Boolean(row.done) };
}

function find(id) {
  return database.prepare("SELECT id, title, done, internal_token FROM notes WHERE id = ?").get(id);
}

if (!database.prepare("SELECT id FROM notes LIMIT 1").get()) {
  database.prepare("INSERT INTO notes (title, done) VALUES (?, ?)").run("Try the portable backend", 0);
}

const handler = createHttpUseHandler({
  operations: {
    list: {
      method: "GET", path: "/api/notes",
      response: { type: "array", items: noteSchema },
      run: () => database.prepare("SELECT id, title, done, internal_token FROM notes ORDER BY id").all().map(publicNote),
    },
    create: {
      method: "POST", path: "/api/notes",
      request: { type: "object", required: ["title"], properties: { title: titleSchema } },
      response: noteSchema,
      run: ({ title }) => {
        const result = database.prepare("INSERT INTO notes (title, done) VALUES (?, ?)").run(title.trim(), 0);
        return publicNote(find(Number(result.lastInsertRowid)));
      },
    },
    update: {
      method: "PUT", path: "/api/notes",
      request: { type: "object", required: ["id"], properties: { id: idSchema, title: titleSchema, done: boolSchema } },
      response: noteSchema,
      run: ({ id, title, done }) => {
        const current = find(id);
        if (!current) throw Object.assign(new Error("Note not found"), { status: 404 });
        database.prepare("UPDATE notes SET title = ?, done = ? WHERE id = ?").run(title === undefined ? current.title : title, done === undefined ? current.done : Number(done), id);
        return publicNote(find(id));
      },
    },
    remove: {
      method: "DELETE", path: "/api/notes",
      request: { type: "object", required: ["id"], properties: { id: idSchema } },
      response: noteSchema,
      run: ({ id }) => {
        const current = find(id);
        if (!current) throw Object.assign(new Error("Note not found"), { status: 404 });
        database.prepare("DELETE FROM notes WHERE id = ?").run(id);
        return publicNote(current);
      },
    },
  },
});

export const server = createServer(handler);
server.listen(port, "127.0.0.1");
