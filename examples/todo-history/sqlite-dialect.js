import { applyEdit, validateEvent } from "./model.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS todo_history_events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,
    todo_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('create', 'edit', 'toggle', 'delete')),
    at_ms INTEGER NOT NULL,
    value_text TEXT
  ) STRICT;
  CREATE TABLE IF NOT EXISTS todo_history_edit_actions (
    event_seq INTEGER NOT NULL REFERENCES todo_history_events(seq) ON DELETE CASCADE,
    ordinal INTEGER NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('cursor', 'move', 'insert', 'delete')),
    argument_text TEXT NOT NULL,
    timing_json TEXT NOT NULL,
    PRIMARY KEY(event_seq, ordinal)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS todo_history_current (
    todo_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    done INTEGER NOT NULL CHECK(done IN (0, 1)),
    deleted INTEGER NOT NULL CHECK(deleted IN (0, 1)),
    updated_seq INTEGER NOT NULL REFERENCES todo_history_events(seq)
  ) STRICT;
  CREATE INDEX IF NOT EXISTS todo_history_events_todo_seq
    ON todo_history_events(todo_id, seq);
`;

function rowEvent(row, actions) {
  const event = {
    id: row.event_id,
    todoId: row.todo_id,
    kind: row.kind,
    atMs: Number(row.at_ms),
  };
  if (row.kind === "create") event.title = row.value_text;
  else if (row.kind === "toggle") event.done = row.value_text === "true";
  else if (row.kind === "edit") {
    const [cursor, ...steps] = actions;
    event.cursor = Number(cursor.argument_text);
    event.actions = steps.map((action) => {
      const timing = JSON.parse(action.timing_json);
      if (action.operation === "move") return { op: "move", by: Number(action.argument_text), delayMs: timing };
      if (action.operation === "insert") return { op: "insert", text: action.argument_text, delaysMs: timing };
      const [direction, count] = action.argument_text.split(":");
      return { op: "delete", direction, count: Number(count), delaysMs: timing };
    });
  }
  return validateEvent(event);
}

export function createSqliteHistoryStore(db) {
  if (!db?.prepare || !db?.exec) throw new Error("SQLite history store requires DatabaseSync");
  db.exec(SCHEMA);
  const insertEvent = db.prepare(
    "INSERT INTO todo_history_events (event_id, todo_id, kind, at_ms, value_text) VALUES (?, ?, ?, ?, ?)",
  );
  const insertAction = db.prepare(
    "INSERT INTO todo_history_edit_actions (event_seq, ordinal, operation, argument_text, timing_json) VALUES (?, ?, ?, ?, ?)",
  );
  const getCurrent = db.prepare(
    "SELECT todo_id, title, done, deleted FROM todo_history_current WHERE todo_id = ?",
  );
  const insertCurrent = db.prepare(
    "INSERT INTO todo_history_current (todo_id, title, done, deleted, updated_seq) VALUES (?, ?, 0, 0, ?)",
  );
  const updateCurrent = db.prepare(
    "UPDATE todo_history_current SET title = ?, done = ?, deleted = ?, updated_seq = ? WHERE todo_id = ?",
  );

  return Object.freeze({
    kind: "sqlite",
    async listEvents() {
      const rows = db.prepare(
        "SELECT seq, event_id, todo_id, kind, at_ms, value_text FROM todo_history_events ORDER BY seq",
      ).all();
      const actionQuery = db.prepare(
        "SELECT operation, argument_text, timing_json FROM todo_history_edit_actions WHERE event_seq = ? ORDER BY ordinal",
      );
      return rows.map((row) => rowEvent(row, row.kind === "edit" ? actionQuery.all(row.seq) : []));
    },
    async state() {
      return db.prepare(
        "SELECT todo_id AS id, title, done FROM todo_history_current WHERE deleted = 0 ORDER BY updated_seq, todo_id",
      ).all().map((row) => ({ id: row.id, title: row.title, done: Boolean(row.done), deleted: false }));
    },
    async append(input) {
      const event = validateEvent(input);
      db.exec("BEGIN IMMEDIATE");
      try {
        const current = getCurrent.get(event.todoId);
        if (event.kind === "create" ? current : !current) throw new Error(
          event.kind === "create" ? "Todo already exists" : `History references unknown todo: ${event.todoId}`,
        );
        let value = null;
        if (event.kind === "create") value = event.title;
        else if (event.kind === "toggle") value = String(event.done);
        const inserted = insertEvent.run(event.id, event.todoId, event.kind, event.atMs, value);
        const seq = Number(inserted.lastInsertRowid);
        if (event.kind === "create") {
          insertCurrent.run(event.todoId, event.title, seq);
        } else {
          let title = current.title;
          let done = Number(current.done);
          let deleted = Number(current.deleted);
          if (event.kind === "edit") {
            insertAction.run(seq, 0, "cursor", String(event.cursor), "0");
            event.actions.forEach((action, index) => {
              if (action.op === "move") insertAction.run(seq, index + 1, "move", String(action.by), JSON.stringify(action.delayMs));
              else if (action.op === "insert") insertAction.run(seq, index + 1, "insert", action.text, JSON.stringify(action.delaysMs));
              else insertAction.run(seq, index + 1, "delete", `${action.direction}:${action.count}`, JSON.stringify(action.delaysMs));
            });
            title = applyEdit(title, event.cursor, event.actions).title;
          } else if (event.kind === "toggle") done = Number(event.done);
          else deleted = 1;
          updateCurrent.run(title, done, deleted, seq, event.todoId);
        }
        db.exec("COMMIT");
        return structuredClone(event);
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  });
}
