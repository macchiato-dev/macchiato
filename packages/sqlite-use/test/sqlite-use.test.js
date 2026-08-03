import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { SqliteUse } from "../src/index.js";

test("projects reads and writes through configured columns", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("create table notes (id integer primary key, title text, secret text)");
  const notes = new SqliteUse(db, { table: "notes", columns: ["title"], writable: ["title"] });

  const created = notes.create({ title: "Visible", secret: "not writable" });
  assert.deepEqual({ ...created }, { id: 1, title: "Visible" });
  assert.deepEqual(notes.list().map((row) => ({ ...row })), [{ id: 1, title: "Visible" }]);
  assert.deepEqual({ ...notes.update(1, { title: "Updated", secret: "still ignored" }) }, { id: 1, title: "Updated" });
  assert.deepEqual({ ...notes.delete(1) }, { id: 1, title: "Updated" });
  assert.equal(notes.get(1), undefined);
  db.close();
});

test("rejects identifiers and empty writes", () => {
  const db = new DatabaseSync(":memory:");
  assert.throws(() => new SqliteUse(db, { table: "notes; drop table notes", columns: [] }), /Invalid SQLite identifier/);
  db.exec("create table notes (id integer primary key, title text)");
  const notes = new SqliteUse(db, { table: "notes", columns: ["title"], writable: ["title"] });
  assert.throws(() => notes.create({ unknown: true }), /No writable fields supplied/);
  db.close();
});
