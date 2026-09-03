import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sessions = new Map();
const directory = dirname(fileURLToPath(import.meta.url));
const maximumOutput = 1024 * 1024;
const idleLifetime = 30 * 60 * 1000;

export function createTerminalSession({ cwd }) {
  const id = randomUUID();
  const shell = process.env.MACCHIATO_TERMINAL_SHELL || "/bin/bash";
  const child = spawn("python3", [join(directory, "pty-bridge.py"), shell], {
    cwd,
    env: { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const value = { id, child, output: "", offset: 0, startedAt: Date.now(), touchedAt: Date.now(), closed: false };
  const append = (chunk) => {
    value.output += chunk.toString("utf8");
    if (value.output.length > maximumOutput) {
      const removed = value.output.length - maximumOutput;
      value.output = value.output.slice(removed);
      value.offset += removed;
    }
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.once("error", (error) => {
    value.closed = true;
    append(`\r\n[terminal failed to start: ${error.message}]\r\n`);
  });
  child.once("exit", (code, signal) => {
    value.closed = true;
    append(`\r\n[terminal exited${signal ? `: ${signal}` : ` with status ${code ?? 0}`}]\r\n`);
  });
  sessions.set(id, value);
  return { id };
}

function getSession(id) {
  const value = sessions.get(id);
  if (!value) throw new Error("terminal session not found");
  value.touchedAt = Date.now();
  return value;
}

export function writeTerminalSession(id, data) {
  const value = getSession(id);
  if (value.closed || !value.child.stdin.writable) throw new Error("terminal session is closed");
  value.child.stdin.write(String(data).slice(0, 64 * 1024));
}

export function readTerminalSession(id, cursor = 0) {
  const value = getSession(id);
  const requested = Number.isSafeInteger(cursor) && cursor >= value.offset ? cursor : value.offset;
  const start = Math.min(value.output.length, Math.max(0, requested - value.offset));
  return { data: value.output.slice(start), cursor: value.offset + value.output.length, closed: value.closed };
}

export function listTerminalSessions() {
  return [...sessions.values()].map(({ id, startedAt, touchedAt, closed }) => ({ id, startedAt, touchedAt, closed }));
}

export function closeTerminalSession(id) {
  const value = sessions.get(id);
  if (!value) return;
  sessions.delete(id);
  if (!value.closed) value.child.kill("SIGTERM");
}

const cleanup = setInterval(() => {
  const cutoff = Date.now() - idleLifetime;
  for (const [id, value] of sessions) if (value.touchedAt < cutoff) closeTerminalSession(id);
}, 60_000);
cleanup.unref();
process.once("exit", () => { for (const id of sessions.keys()) closeTerminalSession(id); });
