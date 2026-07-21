import { HttpUseClient } from "/http-use.js";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";

const list = document.querySelector("#notes");
const status = document.querySelector("#status");
let sandbox;
let http;

function render(notes) {
  list.replaceChildren(...notes.map((note) => {
    const item = document.createElement("li");
    const toggle = document.createElement("button");
    toggle.textContent = note.done ? "Undo" : "Done";
    toggle.dataset.action = "toggle";
    const title = document.createElement("span");
    title.textContent = note.title;
    if (note.done) title.className = "done";
    const rename = document.createElement("button");
    rename.textContent = "Rename";
    rename.dataset.action = "rename";
    const remove = document.createElement("button");
    remove.textContent = "Delete";
    remove.dataset.action = "remove";
    for (const button of [toggle, rename, remove]) button.dataset.id = note.id;
    item.append(toggle, title, rename, remove);
    return item;
  }));
}

async function passThrough(command) {
  if (!command.operation) return;
  status.textContent = "Saving…";
  const value = await http.request(command.operation, command.body);
  const notes = sandbox.callJsonFunction("__notesReceive", { operation: command.operation, value });
  render(notes);
  status.textContent = "Saved";
}

async function main() {
  const [config, source] = await Promise.all([fetch("/api/config").then((r) => r.json()), fetch("/sandbox.js").then((r) => r.text())]);
  http = new HttpUseClient(config);
  sandbox = await createSandbox();
  sandbox.evalGlobal(source, "sqlite-notes-sandbox.js");
  await passThrough({ operation: "list", body: {} });
}

document.querySelector("#new-note").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = event.currentTarget.elements.title;
  await passThrough(sandbox.callJsonFunction("__notesAction", { type: "create", title: input.value }));
  input.value = "";
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = { type: button.dataset.action, id: Number(button.dataset.id) };
  if (action.type === "rename") {
    const current = button.parentElement.querySelector("span").textContent;
    action.title = prompt("Rename note", current);
    if (action.title === null) return;
  }
  await passThrough(sandbox.callJsonFunction("__notesAction", action));
});

main().catch((error) => { status.textContent = error.message; });
