import { expandTimeline } from "/model.js";

const backend = document.querySelector("#backend");
const todoList = document.querySelector("#todos");
const empty = document.querySelector("#empty");
const eventList = document.querySelector("#events");
const replay = document.querySelector("#replay");
const timeline = document.querySelector("#timeline");
const position = document.querySelector("#position");
const play = document.querySelector("#play");
const pause = document.querySelector("#pause");
let snapshot = { todos: [], events: [] };
let frames = [];
let timer = null;

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function api(path) {
  return `${path}?backend=${encodeURIComponent(backend.value)}`;
}

async function append(event) {
  const response = await fetch(api("/api/events"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "Could not save history");
  await load();
}

function eventSummary(event) {
  if (event.kind === "create") return `created “${event.title}”`;
  if (event.kind === "toggle") return event.done ? "completed task" : "reopened task";
  if (event.kind === "delete") return "deleted task";
  const characters = event.actions.reduce((total, action) => total + (
    action.op === "insert" ? [...action.text].length : action.op === "delete" ? action.count : 0
  ), 0);
  return `edited ${characters} character${characters === 1 ? "" : "s"} in ${event.actions.length} compact action${event.actions.length === 1 ? "" : "s"}`;
}

function actionButton(label, action, todo) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", () => action(todo));
  return button;
}

function renderTodos() {
  todoList.replaceChildren(...snapshot.todos.map((todo) => {
    const item = document.createElement("li");
    item.dataset.id = todo.id;
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = todo.done;
    check.setAttribute("aria-label", `Complete ${todo.title}`);
    check.addEventListener("change", () => append({
      id: id("event"), todoId: todo.id, kind: "toggle", done: check.checked, atMs: Date.now(),
    }));
    const title = document.createElement("span");
    title.textContent = todo.title;
    if (todo.done) title.className = "done";
    const controls = document.createElement("div");
    controls.className = "task-actions";
    controls.append(
      actionButton("Edit", beginEdit, todo),
      actionButton("Delete", () => append({ id: id("event"), todoId: todo.id, kind: "delete", atMs: Date.now() }), todo),
    );
    item.append(check, title, controls);
    return item;
  }));
  empty.hidden = snapshot.todos.length > 0;
}

function compact(actions, next) {
  const previous = actions.at(-1);
  if (next.op === "move" && previous?.op === "move" && Math.sign(previous.by) === Math.sign(next.by)) {
    previous.by += next.by;
    previous.delayMs += next.delayMs;
  } else if (next.op === "insert" && previous?.op === "insert") {
    previous.text += next.text;
    previous.delaysMs.push(...next.delaysMs);
  } else if (next.op === "delete" && previous?.op === "delete" && previous.direction === next.direction) {
    previous.count += next.count;
    previous.delaysMs.push(...next.delaysMs);
  } else actions.push(next);
}

function beginEdit(todo) {
  const row = todoList.querySelector(`[data-id="${CSS.escape(todo.id)}"]`);
  const original = todo.title;
  const input = document.createElement("input");
  input.className = "edit-title";
  input.value = original;
  input.maxLength = 500;
  const save = document.createElement("button");
  save.textContent = "Save edit";
  const cancel = document.createElement("button");
  cancel.textContent = "Cancel";
  const form = document.createElement("form");
  form.className = "edit-form";
  form.append(input, save, cancel);
  row.replaceChildren(form);
  input.focus();
  input.setSelectionRange(original.length, original.length);

  const startCursor = original.length;
  let recordedCursor = startCursor;
  let lastAt = performance.now();
  const actions = [];
  const elapsed = () => {
    const current = performance.now();
    const delay = Math.max(0, Math.min(60_000, Math.round(current - lastAt)));
    lastAt = current;
    return delay;
  };
  const syncCursor = (cursor) => {
    const movement = cursor - recordedCursor;
    if (movement) {
      compact(actions, { op: "move", by: movement, delayMs: elapsed() });
      recordedCursor = cursor;
    }
  };

  input.addEventListener("keyup", (event) => {
    if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") {
      syncCursor(input.selectionStart);
    }
  });
  input.addEventListener("beforeinput", (event) => {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    syncCursor(start);
    const delayMs = elapsed();
    if (end > start) {
      compact(actions, { op: "delete", direction: "forward", count: end - start, delaysMs: [delayMs, ...Array(end - start - 1).fill(0)] });
    }
    if (event.inputType === "insertText" || event.inputType === "insertFromPaste") {
      const inserted = event.data || "";
      if (inserted) {
        compact(actions, { op: "insert", text: inserted, delaysMs: [delayMs, ...Array(Math.max(0, [...inserted].length - 1)).fill(0)] });
        recordedCursor = start + inserted.length;
      }
    } else if (event.inputType === "deleteContentBackward" && end === start && start > 0) {
      compact(actions, { op: "delete", direction: "backward", count: 1, delaysMs: [delayMs] });
      recordedCursor = start - 1;
    } else if (event.inputType === "deleteContentForward" && end === start && start < input.value.length) {
      compact(actions, { op: "delete", direction: "forward", count: 1, delaysMs: [delayMs] });
    }
  });
  cancel.addEventListener("click", (event) => {
    event.preventDefault();
    renderTodos();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    syncCursor(input.selectionStart);
    if (input.value === original) return renderTodos();
    save.disabled = true;
    try {
      await append({ id: id("event"), todoId: todo.id, kind: "edit", cursor: startCursor, actions, atMs: Date.now() });
    } catch (error) {
      save.disabled = false;
      alert(error.message);
    }
  });
}

function renderReplay(index) {
  const frame = frames[index];
  const todos = frame?.todos || [];
  replay.replaceChildren(...todos.map((todo) => {
    const line = document.createElement("p");
    line.textContent = `${todo.done ? "✓" : "○"} ${todo.title}`;
    return line;
  }));
  if (!todos.length) replay.textContent = "Timeline starts empty.";
  position.value = `${Math.min(index + 1, frames.length)} / ${frames.length}`;
  timeline.value = String(index);
  [...eventList.children].forEach((item) => item.classList.toggle("active", item.dataset.event === frame?.eventId));
}

function renderHistory() {
  frames = expandTimeline(snapshot.events);
  stop();
  timeline.max = String(Math.max(0, frames.length - 1));
  timeline.value = String(Math.max(0, frames.length - 1));
  eventList.replaceChildren(...snapshot.events.map((event) => {
    const item = document.createElement("li");
    item.dataset.event = event.id;
    const time = document.createElement("time");
    time.dateTime = new Date(event.atMs).toISOString();
    time.textContent = new Date(event.atMs).toLocaleTimeString();
    const description = document.createElement("span");
    description.textContent = eventSummary(event);
    item.append(time, description);
    item.addEventListener("click", () => {
      const index = frames.findLastIndex((frame) => frame.eventId === event.id);
      renderReplay(Math.max(0, index));
    });
    return item;
  }));
  renderReplay(Math.max(0, frames.length - 1));
}

async function load() {
  stop();
  const response = await fetch(api("/api/snapshot"));
  snapshot = await response.json();
  if (!response.ok) throw new Error(snapshot.error || "Could not load history");
  renderTodos();
  renderHistory();
}

function stop() {
  clearTimeout(timer);
  timer = null;
  play.disabled = frames.length < 2;
  pause.disabled = true;
}

function playNext(index) {
  if (index >= frames.length) return stop();
  renderReplay(index);
  if (index === frames.length - 1) return stop();
  const current = frames[index];
  const next = frames[index + 1];
  const sameEvent = current.eventId === next.eventId;
  const delay = sameEvent
    ? next.elapsedMs - current.elapsedMs
    : next.atMs - current.atMs;
  timer = setTimeout(() => playNext(index + 1), Math.max(30, Math.min(2_000, delay)));
}

play.addEventListener("click", () => {
  if (!frames.length) return;
  clearTimeout(timer);
  play.disabled = true;
  pause.disabled = false;
  const current = Number(timeline.value);
  playNext(current >= frames.length - 1 ? 0 : current);
});
pause.addEventListener("click", stop);
timeline.addEventListener("input", () => {
  stop();
  renderReplay(Number(timeline.value));
});
backend.addEventListener("change", () => {
  localStorage.setItem("todo-history-backend", backend.value);
  load().catch(showError);
});
document.querySelector("#create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#new-title");
  await append({ id: id("event"), todoId: id("todo"), kind: "create", title: input.value, atMs: Date.now() });
  input.value = "";
});

function showError(error) {
  replay.textContent = error.message;
}

backend.value = localStorage.getItem("todo-history-backend") || "sqlite";
load().catch(showError);
