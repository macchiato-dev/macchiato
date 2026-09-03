import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const piCli = "/usr/local/node-v26.2.0-linux-arm64/lib/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js";

export function createPiAgent({ cwd, dataDir, onEvent }) {
  let child = null;
  let pending = "";
  let running = false;
  let error = null;

  function emit(kind, text, extra = {}) { onEvent({ kind, text, ...extra }); }
  function consume(event) {
    if (event.type === "agent_start") running = true;
    if (event.type === "agent_settled") { running = false; emit("agent-end", ""); }
    if (event.type === "message_update" && event.assistantMessageEvent?.type === "text_delta") {
      emit("agent-delta", event.assistantMessageEvent.delta || "");
    }
    if (event.type === "message_end" && event.message?.role === "assistant") {
      const text = (event.message.content || []).filter((item) => item.type === "text").map((item) => item.text).join("\n");
      if (text) emit("agent-message", text);
    }
    if (event.type === "tool_execution_start") emit("agent-tool", event.toolName || event.name || "tool");
    if (event.type === "extension_error" || event.type === "error") {
      error = event.error?.message || event.message || "Pi agent error";
      emit("agent-error", error);
    }
  }
  function start() {
    if (child?.exitCode === null) return;
    mkdirSync(join(dataDir, "pi-sessions"), { recursive: true });
    child = spawn(process.execPath, [piCli, "--mode", "rpc", "--provider", "openai-codex", "--model", "gpt-5.6-luna", "--session-dir", join(dataDir, "pi-sessions")], {
      cwd, env: process.env, stdio: ["pipe", "pipe", "pipe"],
    });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      pending += chunk;
      for (;;) {
        const newline = pending.indexOf("\n");
        if (newline < 0) break;
        const line = pending.slice(0, newline).replace(/\r$/, ""); pending = pending.slice(newline + 1);
        if (!line) continue;
        try { consume(JSON.parse(line)); } catch { emit("agent-error", `Invalid Pi RPC event: ${line.slice(0, 160)}`); }
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (text) => { error = text.trim(); if (error) emit("agent-error", error); });
    child.once("exit", (code, signal) => { running = false; child = null; if (code) { error = `Pi exited with status ${code}${signal ? ` (${signal})` : ""}`; emit("agent-error", error); } });
    error = null;
  }
  return Object.freeze({
    prompt(message) { const wasRunning = running; start(); running = true; child.stdin.write(`${JSON.stringify({ id: crypto.randomUUID(), type: "prompt", message, streamingBehavior: wasRunning ? "followUp" : undefined })}\n`); },
    status() { return { installed: true, authenticated: existsSync(join(homedir(), ".pi", "agent", "auth.json")), running, pid: child?.pid || null, error }; },
    stop() { if (child) child.kill("SIGTERM"); },
  });
}
