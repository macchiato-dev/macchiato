import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createAccountStore } from "../../../examples/resources-site/models/accounts.js";
import {
  CONTENT_SCHEMA,
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

test("content schema caps the site at 50,000 projects", () => {
  assert.match(CONTENT_SCHEMA.join("\n"), /COUNT\(\*\) FROM resource_projects\) >= 50000/);
});

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
  assert.deepEqual((await content.listPublicProjects()).map(({ namespace, slug }) => [namespace, slug]), [["latte", "logo"]]);
  assert.deepEqual(await content.listPublicProjects({ namespaces: ["benatkin", "resources", "macchiato"] }), []);
  assert.deepEqual((await content.listPublicProjects({ namespaces: ["LATTE", "latte"] })).map(({ namespace, slug }) => [namespace, slug]), [["latte", "logo"]]);
  assert.equal((await content.getPublicProjectWorkspace("latte", "logo")).project.visibility, "public");
  assert.equal(await content.getPublicProjectWorkspace("tiny-tools", "clock"), null);
});

test("content store validates inputs, ownership, and namespace uniqueness", async () => {
  const { account, content } = await stores();
  await assert.rejects(
    content.createOrganization(account.id, { slug: "../bad", name: "Bad", description: "" }),
    ContentValidationError,
  );
  await assert.rejects(
    content.createOrganization(account.id, { slug: "admin", name: "Admin team", description: "" }),
    /reserved/,
  );
  await assert.rejects(
    content.createOrganization(account.id, { slug: "abc", name: "Valid title", description: "" }),
    /at least 4 characters/,
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

test("content store enforces account limits and exposes namespace pages", async () => {
  const { account, content } = await stores();
  for (let index = 1; index <= 5; index++) {
    await content.createOrganization(account.id, { slug: `team-${index}`, name: `Team ${index}`, description: "" });
  }
  await assert.rejects(
    content.createOrganization(account.id, { slug: "team-6", name: "Team 6", description: "" }),
    /at most 5 organizations/,
  );
  let first;
  for (let index = 1; index <= 20; index++) {
    const created = await content.createProject(account.id, {
      namespace: "user", userSlug: account.login, slug: `project-${index}`,
      name: `Project ${index}`, description: "", visibility: index === 1 ? "private" : "public", template: "blank",
    });
    first ||= created;
  }
  await assert.rejects(
    content.createProject(account.id, { namespace: "user", userSlug: account.login, slug: "project-21", name: "Project 21", template: "blank" }),
    /at most 20 projects/,
  );
  assert.equal((await content.getNamespace("latte")).projects.length, 19);
  assert.equal((await content.getNamespace("latte", account.id)).projects.length, 20);
  const updated = await content.updateProject(account.id, first.id, {
    namespace: "user", userSlug: account.login, slug: "renamed", name: "Renamed",
    description: "Updated", visibility: "public", template: "article",
  });
  assert.equal(updated.slug, "renamed");
  assert.equal(updated.template, "article");
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

test("template replacement and undo keep project metadata aligned with the snapshot", async () => {
  let clock = 10_000;
  const { account, content } = await stores({ now: () => ++clock });
  const hello = { files: [{ path: "index.html", content: "<h1>Hello</h1>" }], config: { entry: "index.html", template: "hello", container: "page" } };
  const mark = { files: [{ path: "image.svg", content: "<svg></svg>" }], config: { entry: "image.svg", template: "mark", container: "svg" } };
  const created = await content.createProject(account.id, {
    namespace: "user", userSlug: account.login, slug: "template-undo", name: "Template undo",
    description: "", visibility: "public", template: "hello", snapshot: hello,
  });
  await content.saveProjectSnapshot(account.id, created.id, mark, { destructive: true });
  assert.equal((await content.getProject("latte", "template-undo", account.id)).template, "mark");
  assert.equal((await content.getProjectWorkspace("latte", "template-undo", account.id)).hasUnpublishedChanges, true);
  assert.deepEqual((await content.getPublicProjectWorkspace("latte", "template-undo")).snapshot, hello);
  await content.saveProjectSnapshot(account.id, created.id, hello, { destructive: true });
  let restored = await content.getProjectWorkspace("latte", "template-undo", account.id);
  assert.equal(restored.project.template, "hello");
  assert.deepEqual(restored.snapshot, hello);
  assert.equal(restored.hasUnpublishedChanges, false);
  assert.equal(restored.versionCount, 3);
  await content.saveProjectSnapshot(account.id, created.id, mark, { destructive: true });
  assert.equal(await content.publishProject(account.id, created.id), true);
  assert.deepEqual((await content.getPublicProjectWorkspace("latte", "template-undo")).snapshot, mark);
  await content.saveProjectSnapshot(account.id, created.id, hello, { destructive: true });
  await content.revertProjectToPublished(account.id, created.id);
  restored = await content.getProjectWorkspace("latte", "template-undo", account.id);
  assert.deepEqual(restored.snapshot, mark);
  assert.equal(restored.hasUnpublishedChanges, false);
  assert.equal(await content.deleteProject(account.id, created.id), true);
  assert.equal(await content.getProject("latte", "template-undo", account.id), null);
});
