import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMarkdownHistoryStore, encodeMarkdownEvent, MARKDOWN_HEADER, parseMarkdownHistory } from "../../../examples/todo-history/markdown-dialect.js";
import { applyEdit, expandTimeline, replayEvents } from "../../../examples/todo-history/model.js";
import { createSqliteHistoryStore } from "../../../examples/todo-history/sqlite-dialect.js";

const events = [
  { id: "e1", todoId: "t1", kind: "create", title: "Get mk", atMs: 1_000 },
  {
    id: "e2",
    todoId: "t1",
    kind: "edit",
    cursor: 0,
    atMs: 2_000,
    actions: [
      { op: "move", by: 5, delayMs: 400 },
      { op: "insert", text: "il", delaysMs: [120, 180] },
    ],
  },
  { id: "e3", todoId: "t1", kind: "toggle", done: true, atMs: 3_000 },
];

test("compact edit actions retain character-level timing", () => {
  const frames = [];
  const result = applyEdit("Get mk", 0, events[1].actions, (frame) => frames.push(frame));
  assert.equal(result.title, "Get milk");
  assert.deepEqual(frames.map(({ action, detail, elapsedMs }) => ({ action, detail, elapsedMs })), [
    { action: "move", detail: 5, elapsedMs: 400 },
    { action: "insert", detail: "i", elapsedMs: 520 },
    { action: "insert", detail: "l", elapsedMs: 700 },
  ]);
  assert.equal(expandTimeline(events).length, 5);
});

test("Markdown dialect is readable, append-only, and round trips history", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "todo-history-markdown-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "history.md");
  const store = createMarkdownHistoryStore(file);
  for (const event of events) await store.append(event);

  assert.deepEqual(await store.state(), [{ id: "t1", title: "Get milk", done: true, deleted: false }]);
  const markdown = await readFile(file, "utf8");
  assert.match(markdown, /```todo-history/);
  assert.match(markdown, /move 5 after 400/);
  assert.match(markdown, /insert "il" delays 120,180/);
  assert.deepEqual(parseMarkdownHistory(markdown), events);
  assert.deepEqual(parseMarkdownHistory(MARKDOWN_HEADER + events.map(encodeMarkdownEvent).join("")), events);
});

test("SQLite dialect normalizes edit actions and matches Markdown replay", async (t) => {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  db.exec("PRAGMA foreign_keys = ON");
  const store = createSqliteHistoryStore(db);
  for (const event of events) await store.append(event);

  assert.deepEqual(await store.listEvents(), events);
  assert.deepEqual(await store.state(), replayEvents(events));
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM todo_history_events").get().count, 3);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM todo_history_edit_actions").get().count, 3);
});
