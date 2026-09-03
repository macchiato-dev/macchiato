import { Terminal } from "/xterm.js";
import { FitAddon } from "/xterm-addon-fit.js";

const terminal = new Terminal({
  cursorBlink: true,
  fontFamily: 'ui-monospace, "Cascadia Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "DejaVu Sans Mono", monospace',
  fontSize: 13,
  lineHeight: 1.2,
  scrollback: 5000,
  theme: { background: "#0b0e11", foreground: "#d8e0e8", cursor: "#a7f3d0", selectionBackground: "#41546688" },
});
const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);
const mount = document.querySelector("#terminal");
const tabs = document.querySelector("#terminal-tabs");
const sessions = [];
let active;
let sequence = 0;
let stopped = false;

terminal.open(mount);

function renderTabs() {
  tabs.replaceChildren(...sessions.map((session) => {
    const wrapper = document.createElement("span");
    wrapper.className = "terminal-tab";
    const select = document.createElement("button");
    select.type = "button";
    select.role = "tab";
    select.ariaSelected = String(session === active);
    const heading = document.createElement("span");
    heading.className = "terminal-tab-heading";
    const name = document.createElement("strong");
    name.textContent = session.name;
    const unread = document.createElement("i");
    unread.className = "terminal-unread";
    unread.hidden = !session.unread;
    unread.title = "New terminal output";
    heading.append(name, unread);
    const summary = document.createElement("small");
    summary.textContent = session.summary;
    select.append(heading, summary);
    select.addEventListener("click", () => activate(session));
    const close = document.createElement("button");
    close.type = "button";
    close.className = "close-terminal";
    close.ariaLabel = `Close ${session.name}`;
    close.textContent = "×";
    close.addEventListener("click", () => closeSession(session));
    wrapper.append(select, close);
    return wrapper;
  }));
}

function activate(session) {
  active = session;
  session.unread = false;
  terminal.reset();
  if (session.output) terminal.write(session.output);
  renderTabs();
  fetch("/api/terminal/active", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: session.id }) });
  terminal.focus();
  requestAnimationFrame(resize);
}

async function poll(session) {
  while (!stopped && !session.closed) {
    try {
      const response = await fetch(`/api/terminal/output?id=${encodeURIComponent(session.id)}&cursor=${session.cursor}`);
      const result = await response.json();
      if (result.data) {
        session.output = `${session.output}${result.data}`.slice(-1024 * 1024);
        if (active === session) terminal.write(result.data);
        else {
          session.unread = true;
          renderTabs();
        }
      }
      session.cursor = result.cursor ?? session.cursor;
      session.closed = Boolean(result.closed);
      if (session.closed) renderTabs();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, active === session ? 90 : 350));
  }
}

export async function createSession() {
  const response = await fetch("/api/terminal/session", { method: "POST" });
  const { id } = await response.json();
  const session = { id, name: `Terminal ${++sequence}`, summary: "Starting shell…", input: "", cursor: 0, output: "", closed: false, unread: false };
  sessions.push(session);
  activate(session);
  poll(session);
}

async function restoreSessions() {
  const response = await fetch("/api/terminal/sessions");
  const result = await response.json();
  for (const saved of result.sessions.filter((session) => !session.closed)) {
    sessions.push({ id: saved.id, name: `Terminal ${++sequence}`, summary: "Attached shell", input: "", cursor: 0, output: "", closed: false, unread: false });
  }
  if (!sessions.length) return createSession();
  const selected = sessions.find((session) => session.id === result.activeTerminalId) || sessions.at(-1);
  activate(selected);
  for (const session of sessions) poll(session);
}

async function closeSession(session) {
  session.closed = true;
  await fetch("/api/terminal/session", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: session.id }) });
  sessions.splice(sessions.indexOf(session), 1);
  if (active === session) {
    active = sessions.at(-1);
    if (active) activate(active);
    else {
      terminal.reset();
      renderTabs();
    }
  } else renderTabs();
}

function resize() {
  if (mount.clientWidth < 1) return;
  fitAddon.fit();
}

terminal.onData((data) => {
  if (!active || active.closed) return;
  for (const character of data.startsWith("\u001b") ? "" : data) {
    if (character === "\r") {
      const command = active.input.trim();
      if (command) active.summary = command.slice(0, 80);
      active.input = "";
      renderTabs();
    } else if (character === "\u007f") active.input = active.input.slice(0, -1);
    else if (character >= " " && character !== "\u007f") active.input += character;
  }
  fetch("/api/terminal/input", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: active.id, data }) });
});
document.querySelector("#new-terminal").addEventListener("click", createSession);
window.addEventListener("resize", resize);
const resizeObserver = new ResizeObserver(() => requestAnimationFrame(resize));
resizeObserver.observe(mount);
window.addEventListener("pagehide", () => {
  stopped = true;
  resizeObserver.disconnect();
});

export function focusTerminal() { terminal.focus(); requestAnimationFrame(resize); }
await restoreSessions();
