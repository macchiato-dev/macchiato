import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const directory = resolve(new URL(".", import.meta.url).pathname);
const supervisors = new Map();

function lines(stream, write) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    pending += chunk;
    const parts = pending.split("\n");
    pending = parts.pop();
    for (const line of parts) write(line);
  });
  stream.on("end", () => { if (pending) write(pending); });
}

export function machineControllerSupervisor({ dataDir, port = 3041 }) {
  const key = `${dataDir}\0${port}`;
  if (supervisors.has(key)) return supervisors.get(key);
  mkdirSync(dataDir, { recursive: true });
  const buildDirectory = join(dataDir, "machine-builds");
  mkdirSync(buildDirectory, { recursive: true });
  const databasePath = join(dataDir, "machine-controller-logs.sqlite");
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS controller_runs (
      id INTEGER PRIMARY KEY, started_at INTEGER NOT NULL, stopped_at INTEGER,
      pid INTEGER, exit_code INTEGER, signal TEXT
    );
    CREATE TABLE IF NOT EXISTS controller_logs (
      id INTEGER PRIMARY KEY, run_id INTEGER NOT NULL, recorded_at INTEGER NOT NULL,
      stream TEXT NOT NULL CHECK(stream IN ('stdout','stderr')), line TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES controller_runs(id)
    );`);
  const insertRun = db.prepare("INSERT INTO controller_runs(started_at) VALUES (?)");
  const setPid = db.prepare("UPDATE controller_runs SET pid = ? WHERE id = ?");
  const stopRun = db.prepare("UPDATE controller_runs SET stopped_at = ?, exit_code = ?, signal = ? WHERE id = ?");
  const insertLog = db.prepare("INSERT INTO controller_logs(run_id, recorded_at, stream, line) VALUES (?, ?, ?, ?)");
  const recentLogs = db.prepare(`SELECT recorded_at AS recordedAt, stream, line
    FROM controller_logs ORDER BY id DESC LIMIT ?`);
  let child = null;
  let runId = null;
  let starting = null;

  function start() {
    if (child && child.exitCode === null) return starting || Promise.resolve();
    runId = Number(insertRun.run(Date.now()).lastInsertRowid);
    const deno = process.env.DENO_BIN || join(process.env.HOME || "/root", ".deno", "bin", "deno");
    const cargo = join(process.env.HOME || "/root", ".cargo", "bin", "cargo");
    child = spawn(deno, ["run", "--no-prompt", `--allow-net=127.0.0.1:${port}`,
      `--allow-read=${resolve(directory, "../../..")},${join(process.env.HOME || "/root", ".cargo")},${join(process.env.HOME || "/root", ".rustup")},/usr/lib,/usr/include`,
      `--allow-write=${buildDirectory}`,
      `--allow-run=${cargo}`,
      "--allow-env=MACHINE_CONTROLLER_PORT,MACHINE_BUILD_DIRECTORY,CARGO_TARGET_DIR,HOME,PATH",
      join(directory, "..", "dist", "controller.js")], {
      cwd: directory,
      env: {
        MACHINE_CONTROLLER_PORT: String(port),
        MACHINE_BUILD_DIRECTORY: buildDirectory, CARGO_TARGET_DIR: join(buildDirectory, "cargo-target"),
        HOME: process.env.HOME || "/root", PATH: process.env.PATH || "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    setPid.run(child.pid, runId);
    lines(child.stdout, (line) => insertLog.run(runId, Date.now(), "stdout", line));
    lines(child.stderr, (line) => insertLog.run(runId, Date.now(), "stderr", line));
    child.once("error", (error) => {
      insertLog.run(runId, Date.now(), "stderr", `process error: ${error.message}`);
      stopRun.run(Date.now(), null, "spawn-error", runId);
      child = null;
      starting = null;
    });
    child.once("exit", (code, signal) => {
      stopRun.run(Date.now(), code, signal, runId);
      child = null;
      starting = null;
    });
    starting = new Promise((resolveReady, reject) => {
      const deadline = Date.now() + 5_000;
      const check = async () => {
        if (!child) return reject(new Error("Deno machine controller stopped during startup"));
        try {
          const response = await fetch(`http://127.0.0.1:${port}/-/health`);
          if (response.ok) return resolveReady();
        } catch {}
        if (Date.now() >= deadline) return reject(new Error("Deno machine controller startup timed out"));
        setTimeout(check, 40);
      };
      check();
    });
    return starting;
  }

  function stop() {
    if (child && child.exitCode === null) child.kill("SIGTERM");
  }

  const supervisor = Object.freeze({
    start,
    stop,
    status() { return { running: Boolean(child), pid: child?.pid || null, runId, port, databasePath }; },
    logs(limit = 100) {
      return recentLogs.all(Math.max(1, Math.min(Number(limit) || 100, 500))).reverse();
    },
  });
  supervisors.set(key, supervisor);
  process.once("exit", stop);
  return supervisor;
}
