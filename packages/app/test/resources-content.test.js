import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createAccountStore } from "@macchiato-dev/hub/accounts";
import {
  CONTENT_SCHEMA,
  ContentConflictError,
  ContentValidationError,
  createContentStore,
} from "@macchiato-dev/hub/content";
import { createNodeSqliteClient } from "../../../packages/website/adapters/node-sqlite-client.js";

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
  return { account,
    content: createContentStore(client, { now, randomId: () => `content-${++id}` }), db };
}

test("content schema caps the site at 50,000 projects", () => {
  assert.match(CONTENT_SCHEMA.join("\n"), /COUNT\(\*\) FROM resource_projects\) >= 50000/);
});

test("only the latest successful output is retained, apart from source history", async () => {
  const { content, account, db } = await stores();
  const source = text => ({ files: [{ path: "index.html", content: text }], config: {} });
  const first = source("first"), second = source("second"), broken = source("<unfinished");
  const output = project => ({ format: "resources-project-output-v1", project,
    compiled: JSON.stringify({ tree: [], document: {}, stylesheets: [], scripts: [] }) });
  const project = await content.createProject(account.id, { namespace: "user", userSlug: "latte",
    slug: "cached", name: "Cached", description: "", visibility: "public", template: "html", snapshot: first });
  assert.equal(await content.getProjectBuildOutput(project.id, account.id), null);
  const before = db.prepare("SELECT * FROM resource_project_state").get();
  assert.deepEqual(await content.saveProjectBuildOutput(account.id, project.id, first, output(first)), { saved: true });
  assert.deepEqual(db.prepare("SELECT * FROM resource_project_state").get(), before);
  assert.equal((await content.listProjectVersions(project.id, account.id)).length, 1);
  assert.deepEqual((await content.getPublicProjectWorkspace("latte", "cached")).savedOutput, output(first));
  assert.equal(await content.saveProjectBuildOutput("other", project.id, second, output(second)), null);
  await content.saveProjectSnapshot(account.id, project.id, second);
  await content.saveProjectBuildOutput(account.id, project.id, second, output(second));
  assert.equal(db.prepare("SELECT count(*) AS n FROM resource_project_build_output").get().n, 1);
  assert.equal((await content.getPublicProjectWorkspace("latte", "cached")).savedOutput, null,
    "an unpublished successful build is never returned to public visitors");
  assert.deepEqual(await content.saveProjectBuildOutput(account.id, project.id, first, output(first)), { saved: false });
  await content.saveProjectSnapshot(account.id, project.id, broken);
  assert.deepEqual((await content.getProjectWorkspace("latte", "cached", account.id)).savedOutput, output(second));
  await assert.rejects(content.saveProjectBuildOutput(account.id, project.id, broken, {}), /Build output is invalid/);
  assert.deepEqual(await content.getProjectBuildOutput(project.id, account.id), output(second));
  await content.deleteProject(account.id, project.id);
  assert.equal(db.prepare("SELECT count(*) AS n FROM resource_project_build_output").get().n, 0);
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
    /between 4 and 63 characters/,
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
  const { account, content, db } = await stores({ now: () => clock });
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
  assert.equal((await content.listProjectVersions(created.id, account.id))[0].latest, true);

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

  await content.publishProject(account.id, created.id, { title: "First review" });
  const publishedVersions = await content.listProjectVersions(created.id, account.id);
  assert.equal(publishedVersions[0].latest, true);
  assert.equal(publishedVersions[0].title, "First review");

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

  // The newest checkpoint is independently materialized. It remains readable
  // even when a legacy/imported patch earlier in the chain is damaged.
  db.prepare(`UPDATE resource_project_versions SET patch_json = ? WHERE project_id = ? AND sequence = 1`)
    .run(JSON.stringify({ version: 1, files: [], config: [] }), created.id);
  assert.deepEqual(await content.getProjectVersion(created.id, 4, account.id), workspace.snapshot);
});

test("saving historical versions pins only the saved selection and preserves unpublished work", async () => {
  const { account, content } = await stores({ now: () => 1000 });
  const snapshot = text => ({ files: [{ path: "index.html", content: `<p>${text}</p>` }], config: {} });
  const first = snapshot("One"), second = snapshot("Two"), draft = snapshot("Unsaved draft");
  const created = await content.createProject(account.id, {
    namespace: "user", userSlug: account.login, slug: "selection", name: "Selection",
    description: "", visibility: "public", template: "html", snapshot: first,
  });
  await content.saveProjectSnapshot(account.id, created.id, second, { reason: "manual" });
  await content.publishProject(account.id, created.id, { title: "Second" });
  await content.saveProjectSnapshot(account.id, created.id, draft);
  await content.publishProject(account.id, created.id, { sequence: 1 });
  let versions = await content.listProjectVersions(created.id, account.id);
  assert.deepEqual(versions.map(version => [version.sequence, version.latest]), [[1, true], [3, false], [2, false]]);
  assert.deepEqual(await content.getProjectVersion(created.id, 3, account.id), draft);
  assert.deepEqual((await content.getProjectWorkspace("latte", "selection", account.id)).snapshot, first);
  assert.equal((await content.getProjectWorkspace("latte", "selection", account.id)).hasUnpublishedChanges, false);
  await content.publishProject(account.id, created.id, { sequence: 2 });
  versions = await content.listProjectVersions(created.id, account.id);
  assert.deepEqual(versions.map(version => [version.sequence, version.latest]), [[2, true], [3, false], [1, false]]);
  assert.equal(versions[0].title, "Second", "plain Save preserves an existing version title");
  assert.deepEqual(await content.getProjectVersion(created.id, 3, account.id), draft);
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
