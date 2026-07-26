import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const cli = join(repoRoot, "packages/macchiato/src/macchiato.js");

function run(dataDir, args, input) {
  return spawnSync(process.execPath, [cli, "--data-dir", dataDir, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    input,
  });
}

test("CLI configures only declared app environment and redacts secret values", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "macchiato-app-env-"));
  try {
    assert.equal(run(dataDir, ["app", "install", "resources-edge"]).status, 0);
    assert.equal(run(dataDir, ["app", "env", "set", "resources-edge", "GITLAB_CLIENT_ID", "client-id"]).status, 0);
    assert.equal(run(dataDir, ["app", "env", "set", "resources-edge", "GITLAB_CLIENT_SECRET", "--stdin"], "super-secret").status, 0);

    const list = run(dataDir, ["app", "env", "list", "resources-edge"]);
    assert.equal(list.status, 0);
    assert.match(list.stdout, /GITLAB_CLIENT_SECRET \(secret\)/);
    assert.doesNotMatch(list.stdout, /super-secret/);

    const undeclared = run(dataDir, ["app", "env", "set", "resources-edge", "UNDECLARED", "value"]);
    assert.notEqual(undeclared.status, 0);
    assert.match(undeclared.stderr, /not declared/);

    const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
    assert.equal(
      db.prepare("SELECT value FROM app_environment WHERE subdomain = ? AND name = ?")
        .get("resources-edge", "GITLAB_CLIENT_SECRET").value,
      "super-secret",
    );
    db.close();
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
