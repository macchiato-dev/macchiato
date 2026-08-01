import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createAccountStore } from "../../../examples/resources-site/models/accounts.js";
import {
  ContentConflictError,
  ContentValidationError,
  createContentStore,
} from "../../../examples/resources-site/models/content.js";
import { createNodeSqliteClient } from "../../../examples/resources-site/adapters/node-sqlite-client.js";

async function stores({ now = () => 200 } = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const client = createNodeSqliteClient(db);
  const accounts = createAccountStore(client, { now: () => 100, randomId: () => "user-1" });
  const account = await accounts.authenticateIdentity({
    provider: "github",
    providerUserId: "42",
    login: "latte",
    name: "Latte",
    email: "latte@example.test",
    emailVerified: true,
  });
  let id = 0;
  return { account, content: createContentStore(client, { now, randomId: () => `content-${++id}` }) };
}

test("content store creates organizations and namespaced projects", async () => {
  const { account, content } = await stores();
  const organization = await content.createOrganization(account.id, {
    slug: "tiny-tools",
    name: "Tiny Tools",
    description: "Small things.",
  });
  const privateProject = await content.createProject(account.id, {
    namespace: organization.id,
    userSlug: account.login,
    slug: "clock",
    name: "Clock",
    description: "A tiny clock.",
    visibility: "private",
    template: "html",
  });
  await content.createProject(account.id, {
    namespace: "user",
    userSlug: account.login,
    slug: "logo",
    name: "Logo",
    description: "",
    visibility: "public",
    template: "svg",
  });

  const listed = await content.listForUser(account.id);
  assert.deepEqual(listed.organizations.map(({ slug }) => slug), ["tiny-tools"]);
  assert.deepEqual(listed.projects.map(({ namespace, slug }) => [namespace, slug]), [
    ["tiny-tools", "clock"],
    ["latte", "logo"],
  ]);
  assert.equal((await content.getProject("tiny-tools", "clock", account.id)).id, privateProject.id);
  assert.equal(await content.getProject("tiny-tools", "clock"), null);
  assert.equal((await content.getProject("latte", "logo")).visibility, "public");
});

test("content store validates inputs, ownership, and namespace uniqueness", async () => {
  const { account, content } = await stores();
  await assert.rejects(
    content.createOrganization(account.id, { slug: "../bad", name: "Bad", description: "" }),
    ContentValidationError,
  );
  await content.createOrganization(account.id, { slug: "team", name: "Team", description: "" });
  await assert.rejects(
    content.createOrganization(account.id, { slug: "team", name: "Again", description: "" }),
    ContentConflictError,
  );
  await assert.rejects(
    content.createProject(account.id, {
      namespace: "missing",
      userSlug: "latte",
      slug: "project",
      name: "Project",
      description: "",
      template: "blank",
    }),
    /organization is not available/,
  );
});

test("content store versions multi-file project state periodically and around destructive changes", async () => {
  let clock = 1_000;
  const { account, content } = await stores({ now: () => clock });
  const created = await content.createProject(account.id, {
    namespace: "user", userSlug: account.login, slug: "history", name: "History",
    description: "", visibility: "private", template: "html",
    snapshot: {
      files: [{ path: "index.html", content: "<h1>One</h1>" }, { path: "app.js", content: "one();" }],
      config: { sandbox: { network: false }, entry: "index.html" },
    },
  });
  let workspace = await content.getProjectWorkspace("latte", "history", account.id);
  assert.equal(workspace.versionCount, 1);
  assert.equal((await content.listProjectVersions(created.id, account.id)).length, 1);

  clock += 60_000;
  await content.saveProjectSnapshot(account.id, created.id, {
    files: [{ path: "index.html", content: "<h1>Two</h1>" }, { path: "app.js", content: "one();" }],
    config: workspace.snapshot.config,
  });
  assert.equal((await content.listProjectVersions(created.id, account.id)).length, 1);

  clock += 300_000;
  await content.saveProjectSnapshot(account.id, created.id, {
    files: [{ path: "index.html", content: "<h1>Three</h1>" }, { path: "app.js", content: "one();" }],
    config: workspace.snapshot.config,
  });
  assert.equal((await content.listProjectVersions(created.id, account.id)).length, 2);

  clock += 10_000;
  const destructive = await content.saveProjectSnapshot(account.id, created.id, {
    files: [{ path: "index.html", content: "<h1>Three</h1>" }],
    config: { sandbox: { network: false }, entry: "index.html" },
  });
  assert.equal(destructive.versionCount, 3);
  assert.equal((await content.getProjectVersion(created.id, 2, account.id)).files.length, 2);
  assert.equal((await content.getProjectVersion(created.id, 3, account.id)).files.length, 1);

  clock += 10_000;
  const restored = await content.restoreProjectVersion(account.id, created.id, 1);
  assert.equal(restored.versionCount, 4);
  workspace = await content.getProjectWorkspace("latte", "history", account.id);
  assert.equal(workspace.snapshot.files.find((file) => file.path === "index.html").content, "<h1>One</h1>");
  assert.equal(workspace.snapshot.files.length, 2);
});
