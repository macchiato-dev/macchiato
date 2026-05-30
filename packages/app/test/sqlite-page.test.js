import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import test from "node:test";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const macchiatoCli = join(repoRoot, "packages", "macchiato", "src", "macchiato.js");
const appCli = join(repoRoot, "packages", "app", "src", "index.js");

function tempDir() {
  return mkdtemp(join(tmpdir(), "macchiato-test-"));
}

function getPort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });
}

function runNode(args, env) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolveRun({ stdout, stderr });
      else reject(new Error(`Command failed (${code}): ${args.join(" ")}\n${stdout}\n${stderr}`));
    });
  });
}

function startApp(args, env) {
  const child = spawn(process.execPath, args, {
    cwd: repoRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let ready = false;

  const waitForReady = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Server did not start\n${output}`));
    }, 5000);
    const onData = (chunk) => {
      output += chunk;
      if (!ready && output.includes("Server running")) {
        ready = true;
        clearTimeout(timer);
        resolveReady();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("exit", (code) => {
      if (!ready) {
        clearTimeout(timer);
        reject(new Error(`Server exited before ready (${code})\n${output}`));
      }
    });
  });

  return { child, waitForReady };
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolveStop) => {
    child.once("exit", resolveStop);
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 1000).unref();
  });
}

test("serves a sandboxed SQLite page from an isolated test database", async (t) => {
  const dataDir = await tempDir();
  const dbPath = join(dataDir, "macchiato.sqlite3");
  const env = { ...process.env };
  const port = await getPort();
  let app;

  t.after(async () => {
    if (app) await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await runNode([
    macchiatoCli,
    "--data-dir",
    dataDir,
    "schema",
    "add",
    "@macchiato-dev/dom-use@0.0.1/article.json",
    "examples/dom-use-demo/dom.schema.json",
  ], env);
  await runNode([
    macchiatoCli,
    "--data-dir",
    dataDir,
    "schema",
    "add",
    "@macchiato-dev/style-use@0.0.1/basic.json",
    "examples/dom-use-demo/css.schema.json",
  ], env);
  await runNode([
    macchiatoCli,
    "--data-dir",
    dataDir,
    "site",
    "add-page",
    "dom-use",
    "examples/dom-use-demo/page.html",
    "examples/dom-use-demo/style.css",
    "@macchiato-dev/dom-use@0.0.1/article.json",
    "@macchiato-dev/style-use@0.0.1/basic.json",
    "--title",
    "Neighborhood Library",
  ], env);

  assert.equal((await stat(dbPath)).isFile(), true);

  app = startApp([appCli, "--data-dir", dataDir, "--host", "127.0.0.1", "--port", String(port)], env);
  await app.waitForReady;

  const response = await fetch(`http://dom-use.localhost:${port}/`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<title>Neighborhood Library<\/title>/);
  assert.match(html, /<h1>Neighborhood Library<\/h1>/);
  assert.doesNotMatch(html, /Sandbox error/);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /@import|url\(/i);
});
