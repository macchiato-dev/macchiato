const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const MAX_TITLE = 500;
const MAX_ACTIONS = 2_000;
const MAX_DELAY = 60_000;

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid ${label}`);
  return value;
}

function identifier(value, label) {
  if (typeof value !== "string" || !ID.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}

function text(value, label) {
  if (typeof value !== "string" || value.length > MAX_TITLE) throw new Error(`Invalid ${label}`);
  return value;
}

function delays(value, expected) {
  if (!Array.isArray(value) || value.length !== expected) throw new Error("Invalid edit delays");
  return value.map((delay) => integer(delay, "edit delay", { max: MAX_DELAY }));
}

export function validateEvent(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid history event");
  const event = {
    id: identifier(input.id, "event id"),
    todoId: identifier(input.todoId, "todo id"),
    kind: input.kind,
    atMs: integer(input.atMs, "event time"),
  };
  if (input.kind === "create") {
    event.title = text(input.title, "title");
  } else if (input.kind === "toggle") {
    if (typeof input.done !== "boolean") throw new Error("Invalid toggle value");
    event.done = input.done;
  } else if (input.kind === "delete") {
    // The event envelope is sufficient.
  } else if (input.kind === "edit") {
    event.cursor = integer(input.cursor, "edit cursor", { max: MAX_TITLE });
    if (!Array.isArray(input.actions) || input.actions.length > MAX_ACTIONS) throw new Error("Invalid edit actions");
    event.actions = input.actions.map((inputAction) => {
      if (!inputAction || typeof inputAction !== "object") throw new Error("Invalid edit action");
      if (inputAction.op === "move") {
        const by = integer(Math.abs(inputAction.by), "move distance", { max: MAX_TITLE });
        if (!by || inputAction.by === 0) throw new Error("Invalid move distance");
        return { op: "move", by: inputAction.by < 0 ? -by : by, delayMs: integer(inputAction.delayMs, "move delay", { max: MAX_DELAY }) };
      }
      if (inputAction.op === "insert") {
        const inserted = text(inputAction.text, "insert text");
        if (!inserted.length) throw new Error("Invalid insert text");
        return { op: "insert", text: inserted, delaysMs: delays(inputAction.delaysMs, [...inserted].length) };
      }
      if (inputAction.op === "delete") {
        if (!["backward", "forward"].includes(inputAction.direction)) throw new Error("Invalid delete direction");
        const count = integer(inputAction.count, "delete count", { min: 1, max: MAX_TITLE });
        return { op: "delete", direction: inputAction.direction, count, delaysMs: delays(inputAction.delaysMs, count) };
      }
      throw new Error("Invalid edit operation");
    });
  } else {
    throw new Error("Invalid history event kind");
  }
  return Object.freeze(event);
}

export function applyEdit(title, cursor, actions, onFrame = null) {
  let value = title;
  let position = Math.min(cursor, value.length);
  let elapsedMs = 0;
  const frame = (action, detail, delayMs) => {
    elapsedMs += delayMs;
    onFrame?.({ title: value, cursor: position, elapsedMs, action, detail });
  };
  for (const action of actions) {
    if (action.op === "move") {
      position = Math.max(0, Math.min(value.length, position + action.by));
      frame("move", action.by, action.delayMs);
    } else if (action.op === "insert") {
      [...action.text].forEach((character, index) => {
        value = value.slice(0, position) + character + value.slice(position);
        position += character.length;
        frame("insert", character, action.delaysMs[index]);
      });
    } else {
      for (let index = 0; index < action.count; index += 1) {
        if (action.direction === "backward" && position > 0) {
          const before = [...value.slice(0, position)];
          const removed = before.pop() || "";
          const start = before.join("").length;
          value = value.slice(0, start) + value.slice(position);
          position = start;
          frame("delete", removed, action.delaysMs[index]);
        } else if (action.direction === "forward" && position < value.length) {
          const removed = [...value.slice(position)][0] || "";
          value = value.slice(0, position) + value.slice(position + removed.length);
          frame("delete", removed, action.delaysMs[index]);
        } else {
          frame("delete", "", action.delaysMs[index]);
        }
      }
    }
  }
  return { title: value, cursor: position, elapsedMs };
}

export function replayEvents(events, { through = events.length } = {}) {
  const todos = new Map();
  for (const raw of events.slice(0, through)) {
    const event = validateEvent(raw);
    if (event.kind === "create") {
      todos.set(event.todoId, { id: event.todoId, title: event.title, done: false, deleted: false });
      continue;
    }
    const todo = todos.get(event.todoId);
    if (!todo) throw new Error(`History references unknown todo: ${event.todoId}`);
    if (event.kind === "edit") todo.title = applyEdit(todo.title, event.cursor, event.actions).title;
    else if (event.kind === "toggle") todo.done = event.done;
    else if (event.kind === "delete") todo.deleted = true;
  }
  return [...todos.values()].filter((todo) => !todo.deleted).map((todo) => ({ ...todo }));
}

export function expandTimeline(events) {
  const todos = new Map();
  const frames = [];
  const snapshot = (event, elapsedMs, action, detail) => frames.push({
    eventId: event.id,
    eventKind: event.kind,
    atMs: event.atMs,
    elapsedMs,
    action,
    detail,
    todos: [...todos.values()].filter((todo) => !todo.deleted).map((todo) => ({ ...todo })),
  });
  for (const raw of events) {
    const event = validateEvent(raw);
    if (event.kind === "create") {
      todos.set(event.todoId, { id: event.todoId, title: event.title, done: false, deleted: false });
      snapshot(event, 0, "create", event.title);
      continue;
    }
    const todo = todos.get(event.todoId);
    if (!todo) continue;
    if (event.kind === "edit") {
      applyEdit(todo.title, event.cursor, event.actions, (step) => {
        todo.title = step.title;
        snapshot(event, step.elapsedMs, step.action, step.detail);
      });
      if (!event.actions.length) snapshot(event, 0, "edit", "");
    } else if (event.kind === "toggle") {
      todo.done = event.done;
      snapshot(event, 0, "toggle", event.done);
    } else {
      todo.deleted = true;
      snapshot(event, 0, "delete", "");
    }
  }
  return frames;
}
