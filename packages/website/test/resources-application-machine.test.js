import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { ServerMachineController } from "../../server-use/src/machine-controller.js";
import { createNodeSqliteClient } from "../adapters/node-sqlite-client.js";

const generated = new URL("../generated/", import.meta.url);

function wireResult(result) {
  const columns = Array.from(result.columns || Object.keys(result.rows?.[0] || {}), String);
  return [columns, Array.from(result.rows || [], row =>
    columns.map(column => row[column])), Number(result.rowsAffected) || 0];
}

async function withTimeout(promise) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("application machine timed out")), 2_000);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

test("the application machine initializes stores through the SQL policy machine", async () => {
  const database = createNodeSqliteClient(new DatabaseSync(":memory:"));
  const calls = [];
  const policyModule = await WebAssembly.compile(await readFile(new URL(
    "microquickjs-server.wasm", generated)));
  const policyDirectory = new URL("resources-policy-bytecode/", generated);
  const policyBytecodes = await Promise.all((await readdir(policyDirectory))
    .filter(name => name.endsWith(".bin")).sort()
    .map(name => readFile(new URL(name, policyDirectory))));
  const policy = new ServerMachineController(policyModule, {
    bytecodes: policyBytecodes,
    devices: { database: async (operation, input) => {
      calls.push([operation, input[0]?.slice?.(0, 48)]);
      if (operation === "batch") {
        return (await database.batch(input.map(([sql, args]) => ({ sql, args }))))
          .map(result => Number(result.rowsAffected) || 0);
      }
      return wireResult(await database.execute({ sql: input[0], args: input[1] }));
    } },
  });
  const applicationModule = await WebAssembly.compile(await readFile(new URL(
    "resources-application-machine/quickjs-server.wasm", generated)));
  const randomIds = ["user-1", "project-1"];
  const application = new ServerMachineController(applicationModule, {
    bytecodes: [await readFile(new URL(
      "resources-application-machine/application.bin", generated))],
    devices: {
      sql: async (operation, input) => {
        const result = await policy.request(["database-client", operation, input]);
        if (!Array.isArray(result) || result[0] !== "ok") {
          throw new Error(Array.isArray(result) ? result[2] : "policy rejected SQL");
        }
        return result[1];
      },
      clock: async () => 123,
      random: async () => randomIds.shift() || "unused-id",
    },
  });

  const first = await withTimeout(application.request(["initialize"]));
  if (first[0] !== "ok") {
    const ledger = await database.execute({
      sql: "SELECT version, name FROM resource_schema_migrations ORDER BY version",
      args: [],
    });
    assert.fail(`${JSON.stringify(first)}; ledger=${JSON.stringify(ledger.rows)}; calls=${calls.length}`);
  }
  assert.deepEqual(await application.request(["initialize"]), ["ok"]);
  const tables = await database.execute({
    sql: "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name",
    args: [],
  });
  assert.ok(tables.rows.some(row => row.name === "users"));
  assert.ok(tables.rows.some(row => row.name === "resource_projects"));
  assert.ok(tables.rows.some(row => row.name === "resource_organizations"));
  const account = await withTimeout(application.request(["store", "account",
    "authenticateIdentity", [{ provider: "github", providerUserId: "1",
      login: "latte", name: "Latte", email: "latte@example.test",
      emailVerified: true }, { allowCreate: true }]]));
  assert.deepEqual(account, ["ok", { id: "user-1", login: "latte", name: "Latte" }]);
  assert.deepEqual(await withTimeout(application.request(["store", "account",
    "getAccount", ["user-1"]])), ["ok",
      { id: "user-1", login: "latte", name: "Latte" }]);
  assert.deepEqual(await withTimeout(application.request(["store", "content",
    "listPublicProjects", [{ limit: 6, namespaces: ["benatkin"] }]])),
    ["ok", []]);

  const created = await withTimeout(application.request(["store", "content",
    "createProject", ["user-1", {
    namespace: "user", userSlug: "latte", slug: "first", name: "First",
    description: "", visibility: "private", template: "blank",
    snapshot: { files: [], config: {} },
  }]]));
  assert.equal(created[0], "ok", JSON.stringify(created));
  assert.equal(created[1].id, "project-1");
  const saved = await withTimeout(application.request(["store", "content",
    "saveProjectSnapshot", ["user-1", "project-1", {
      files: [{ path: "index.html", content: "<p>machine owned</p>" }], config: {},
    }, { reason: "manual" }]]));
  assert.equal(saved[0], "ok");
  assert.equal(saved[1].changed, true);
  const workspace = await withTimeout(application.request(["store", "content",
    "getProjectWorkspace", ["latte", "first", "user-1"]]));
  assert.equal(workspace[0], "ok");
  assert.equal(workspace[1].snapshot.files[0].content, "<p>machine owned</p>");
  const plan = await withTimeout(application.request(["document-plan", {
    pathname: "/latte/first", session: { sub: "user-1", login: "latte" },
    staticShellExists: false,
  }]));
  assert.equal(plan[0], "ok");
  assert.equal(plan[1].dynamicProject.id, "project-1");
  assert.equal(plan[1].projectOwner, true);
  assert.equal(plan[1].accountContent.projects.length, 1);
  assert.equal(plan[1].kind, "project");
  assert.equal(plan[1].shellPath, "/dashboard");
  assert.deepEqual(plan[1].csrfActions,
    ["project:project-1", "notifications"]);
  const rejected = await withTimeout(application.request(["store", "content",
    "saveProjectSnapshot", ["user-1", "project-1", {
      files: [], config: { containerOptions: {
        allowedLinkPatterns: ["https://outside.example/path"],
      } },
    }, { reason: "manual" }]]));
  assert.equal(rejected[0], "error");
  assert.equal(rejected[1].field, "snapshot");
  const updated = await withTimeout(application.request(["store", "content",
    "updateProject", ["user-1", "project-1", {
      namespace: "user", userSlug: "latte", slug: "renamed", name: "Renamed",
      description: "Metadata stays in the application machine.",
      visibility: "public", template: "blank",
    }]]));
  assert.equal(updated[0], "ok");
  assert.equal(updated[1].slug, "renamed");
  assert.deepEqual(await withTimeout(application.request(["store", "content",
    "publishProject", ["user-1", "project-1", { title: "Ready" }]])),
    ["ok", true]);
  assert.deepEqual(await withTimeout(application.request(["store", "content",
    "deleteProject", ["user-1", "project-1"]])), ["ok", true]);
});
