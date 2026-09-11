import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "@macchiato-dev/hub/content";
import { createOrganizationStore } from "@macchiato-dev/hub/organizations";
import { createNodeSqliteClient } from "../adapters/node-sqlite-client.js";
import { seal } from "../auth/session.js";
import { createResourcesServerMachine, isResourcesServerMachineRequest } from "../resources-server-machine.js";
import { ServerMachineController } from "../../server-use/src/machine-controller.js";
import { createProjectSnapshotDiffer, createProjectSnapshotValidator,
  createProjectVersionPlanner } from "../project-version-machine.js";
import { validateProjectUrlPatterns } from "../project-snapshot-validation.js";
import { publicResponseHeaders } from "../edge/models.js";
import { policyModule, policyBytecodes, projectVersionBytecodes, serverBytecodes,
  serverModule } from "./server-machine-assets.js";

const secret = "resources-server-machine-test-secret-value";

test("machine document routes preserve public artifact headers without allowing arbitrary headers", async () => {
  const machine = createResourcesServerMachine(serverModule, {
    bytecodes: serverBytecodes, sqlDevice: async () => { throw new Error("unexpected SQL"); },
    authConfig: null,
  });
  for (const key of ["-/blog-examples/example/index.html", "-/resources-site/machine.js"]) {
    const expected = publicResponseHeaders(key, new Headers({
      etag: '"artifact-revision"', "last-modified": "Fri, 11 Sep 2026 00:00:00 GMT",
    }));
    for (const method of ["GET", "HEAD"]) {
      const response = await machine.handle(new Request(`http://resources-edge.localhost/${key}`, { method }), {
        documentHandler: () => new Response(method === "HEAD" ? null : "artifact body", { headers: expected }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual([...response.headers], [...expected]);
      assert.equal(await response.text(), method === "HEAD" ? "" : "artifact body");
    }
  }
  await assert.rejects(machine.handle(new Request("http://resources-edge.localhost/example"), {
    documentHandler: () => new Response("body", { headers: { "x-internal-secret": "test-only" } }),
  }), /cannot return header x-internal-secret/);
});

test("selects every document route and each machine-owned mutation", () => {
  for (const [method, path] of [
    ["GET", "/health"],
    ["GET", "/api/projects/project-1/versions"],
    ["GET", "/api/projects/project-1/versions/3"],
    ["GET", "/-/projects/latte/example/workspace"],
    ["GET", "/"],
    ["HEAD", "/about"],
    ["POST", "/notifications/notice-1"],
    ["POST", "/organizations/coffee/invitations"],
    ["POST", "/organizations/coffee/members/user-1"],
    ["POST", "/organizations"],
    ["POST", "/projects"],
    ["POST", "/projects/project-1"],
    ["POST", "/profile"],
    ["POST", "/logout"],
    ["POST", "/api/projects/project-1/snapshot"],
    ["POST", "/api/projects/project-1/restore/3"],
  ]) assert.equal(isResourcesServerMachineRequest(new Request(`https://resources.co${path}`,
    { method })), true, `${method} ${path}`);
  for (const [method, path] of [["CUSTOM", "/projects/project-1"]]) {
    assert.equal(isResourcesServerMachineRequest(new Request(`https://resources.co${path}`,
      { method })), false, `${method} ${path}`);
  }
});

test("MicroQuickJS owns the authenticated project versions route", async () => {
  const client = createNodeSqliteClient(new DatabaseSync(":memory:"));
  let accountId = 0;
  const accounts = createAccountStore(client, { now: () => 1, randomId: () => `user-${++accountId}` });
  const account = await accounts.authenticateIdentity({
    provider: "github", providerUserId: "1", login: "latte", name: "Latte",
    email: "latte@example.test", emailVerified: true,
  });
  const invited = await accounts.authenticateIdentity({
    provider: "github", providerUserId: "2", login: "mocha", name: "Mocha",
    email: "mocha@example.test", emailVerified: true,
  });
  const createdAt = 1_775_000_000_123;
  let projectIdentifier = 0;
  const validateSnapshot = createProjectSnapshotValidator(serverModule, projectVersionBytecodes);
  const content = createContentStore(client, { now: () => createdAt,
    randomId: () => `project-${++projectIdentifier}`,
    versionPlanner: createProjectVersionPlanner(serverModule, projectVersionBytecodes),
    snapshotDiffer: createProjectSnapshotDiffer(serverModule, projectVersionBytecodes),
    snapshotValidator: async (snapshot) => {
      validateProjectUrlPatterns(snapshot);
      await validateSnapshot(snapshot);
    } });
  const first = { files: [{ path: "index.html", content: "<h1>One</h1>" }], config: {} };
  const second = { files: [{ path: "index.html", content: "<h1>Two</h1>" }], config: {} };
  const project = await content.createProject(account.id, {
    namespace: "user", userSlug: account.login, slug: "example", name: "Example",
    description: "", visibility: "private", template: "blank", snapshot: first,
  });
  await content.saveProjectSnapshot(account.id, project.id, second, { reason: "manual" });
  const authConfig = {
    publicOrigin: "http://resources-edge.localhost", sessionSecret: secret,
    secureCookies: false,
  };
  const policy = new ServerMachineController(policyModule, {
    bytecodes: policyBytecodes,
    devices: { database: async (operation, input) => {
      if (operation === "batch") {
        return (await client.batch(input.map(([sql, args]) => ({ sql, args }))))
          .map(result => Number(result.rowsAffected) || 0);
      }
      const result = await client.execute({ sql: input[0], args: input[1] });
      const columns = Array.from(result.columns || Object.keys(result.rows?.[0] || {}), String);
      return [columns, result.rows.map(row => columns.map(column => row[column])),
        Number(result.rowsAffected) || 0];
    } },
  });
  let sqlError = "";
  const machine = createResourcesServerMachine(serverModule, {
    bytecodes: serverBytecodes,
    sqlDevice: async (operation, input) => {
      const result = await policy.request(["sql", operation, input]);
      if (!Array.isArray(result) || result[0] !== "ok") {
        sqlError = Array.isArray(result) ? String(result[2]) : "policy rejected SQL";
        throw new Error(sqlError);
      }
      return result[1];
    },
    authConfig,
    contentStore: content, now: () => 3,
  });
  const document = await machine.handle(new Request("http://resources-edge.localhost/about"), {
    documentHandler: () => {
      const headers = new Headers({
        "cache-control": "public, max-age=30",
        "content-security-policy": "default-src 'none'",
        "content-type": "text/html; charset=utf-8",
      });
      headers.append("set-cookie", "resources_session=active; Path=/; HttpOnly");
      headers.append("set-cookie", "resources_oauth=; Path=/; Max-Age=0");
      return new Response("machine-routed document", { headers });
    },
  });
  assert.equal(document.status, 200, await document.clone().text());
  assert.equal(document.headers.get("content-security-policy"), "default-src 'none'");
  assert.deepEqual(document.headers.getSetCookie(),
    ["resources_session=active; Path=/; HttpOnly", "resources_oauth=; Path=/; Max-Age=0"]);
  assert.equal(await document.text(), "machine-routed document");
  const protectedDocument = await machine.handle(new Request(
    "http://resources-edge.localhost/projects"));
  assert.equal(protectedDocument.status, 302);
  assert.equal(protectedDocument.headers.get("location"), "/login");
  for (const provider of ["github", "gitlab"]) {
    const protectedLink = await machine.handle(new Request(
      `http://resources-edge.localhost/auth/${provider}/link`));
    assert.equal(protectedLink.status, 302);
    assert.equal(protectedLink.headers.get("location"), "/login");
  }
  const dashboardDocument = await machine.handle(new Request(
    "http://resources-edge.localhost/dashboard"));
  assert.equal(dashboardDocument.status, 302);
  assert.equal(dashboardDocument.headers.get("location"), "/");
  const url = `http://resources-edge.localhost/api/projects/${project.id}/versions`;
  const unauthorized = await machine.handle(new Request(url));
  assert.equal(unauthorized.status, 401, await unauthorized.clone().text());

  const session = await seal({
    v: 1, sub: account.id, login: account.login, name: account.name, iat: 1, exp: 100,
  }, secret);
  const projectCsrf = await seal({
    v: 1, sub: account.id, action: `project:${project.id}`, exp: 100,
  }, secret);
  const workspaceUrl = "http://resources-edge.localhost/-/projects/latte/example/workspace";
  const privateWorkspace = await machine.handle(new Request(workspaceUrl));
  assert.equal(privateWorkspace.status, 404);
  const ownedWorkspace = await machine.handle(new Request(workspaceUrl, {
    headers: { cookie: `resources_session=${session}` },
  }));
  assert.equal(ownedWorkspace.status, 200, await ownedWorkspace.clone().text());
  assert.equal(ownedWorkspace.headers.get("cache-control"), "private, no-store");
  assert.deepEqual((await ownedWorkspace.json()).snapshot, second);

  const publicProject = await content.createProject(account.id, {
    namespace: "user", userSlug: account.login, slug: "public-example", name: "Public",
    description: "", visibility: "public", template: "blank", snapshot: first,
  });
  assert.ok(publicProject);
  const publicWorkspace = await machine.handle(new Request(
    "http://resources-edge.localhost/-/projects/latte/public-example/workspace"));
  assert.equal(publicWorkspace.status, 200, await publicWorkspace.clone().text());
  assert.equal(publicWorkspace.headers.get("cache-control"), "public, max-age=30");
  assert.deepEqual((await publicWorkspace.json()).snapshot, first);
  async function projectPost(path, value, csrf = projectCsrf) {
    return machine.handle(new Request(`http://resources-edge.localhost${path}`, {
      method: "POST",
      headers: {
        cookie: `resources_session=${session}`,
        "content-type": "application/json",
        origin: "http://resources-edge.localhost",
        "x-resources-csrf": csrf,
      },
      body: typeof value === "string" ? value : JSON.stringify(value),
    }));
  }
  const third = { files: [{ path: "index.html", content: "<h1>Three</h1>" }],
    config: { containerOptions: { allowedLinkPatterns: ["*.wikipedia.org"] } } };
  const response = await machine.handle(new Request(url, {
    headers: { cookie: `resources_session=${session}` },
  }));
  assert.equal(response.status, 200, `${await response.clone().text()} ${sqlError}`);
  const listing = await response.json();
  assert.equal(listing.versions.length, 2);
  assert.equal(listing.versions[0].sequence, 2);

  for (const [sequence, snapshot] of [[1, first], [2, second]]) {
    const selected = await machine.handle(new Request(`${url}/${sequence}`, {
      headers: { cookie: `resources_session=${session}` },
    }));
    assert.equal(selected.status, 200);
    assert.deepEqual(await selected.json(), { snapshot });
  }
  assert.equal((await machine.handle(new Request(`${url}/3`, {
    headers: { cookie: `resources_session=${session}` },
  }))).status, 404);

  const savedResponse = await projectPost(`/api/projects/${project.id}/snapshot`, {
    snapshot: third, manual: true,
  });
  assert.equal(savedResponse.status, 200, await savedResponse.clone().text());
  assert.deepEqual(await savedResponse.json(), {
    changed: true, versionCount: 3, snapshot: third,
  });
  const invalidSnapshot = await projectPost(`/api/projects/${project.id}/snapshot`, {
    snapshot: { files: [], config: { containerOptions: { allowedLinkPatterns: [42] } } },
  });
  assert.equal(invalidSnapshot.status, 422);
  assert.equal((await invalidSnapshot.json()).error, "snapshot");
  const invalidJson = await projectPost(`/api/projects/${project.id}/snapshot`, "{");
  assert.equal(invalidJson.status, 400);
  assert.equal((await invalidJson.json()).error, "request_json");
  assert.equal((await projectPost(`/api/projects/${project.id}/snapshot`, {
    snapshot: third,
  }, "invalid")).status, 403);
  const oversized = await machine.handle(new Request(
    `http://resources-edge.localhost/api/projects/${project.id}/snapshot`, {
      method: "POST",
      headers: {
        cookie: `resources_session=${session}`,
        "content-length": String(72 * 1024 * 1024 + 1),
        "content-type": "application/json",
        origin: "http://resources-edge.localhost",
        "x-resources-csrf": projectCsrf,
      },
      body: "{}",
    }));
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error, "request_size");
  const restoredResponse = await projectPost(`/api/projects/${project.id}/restore/1`, {});
  assert.equal(restoredResponse.status, 200, await restoredResponse.clone().text());
  assert.deepEqual((await restoredResponse.json()).snapshot, first);

  async function projectFormPost(path, values, csrf, referer = "/projects") {
    return machine.handle(new Request(`http://resources-edge.localhost${path}`, {
      method: "POST",
      headers: {
        cookie: `resources_session=${session}`,
        "content-type": "application/x-www-form-urlencoded",
        origin: "http://resources-edge.localhost",
        referer: `http://resources-edge.localhost${referer}`,
      },
      body: new URLSearchParams({ ...values, csrf }),
    }));
  }
  const createCsrf = await seal({
    v: 1, sub: account.id, action: "/projects", exp: 100,
  }, secret);
  const unauthenticatedCreate = await machine.handle(new Request(
    "http://resources-edge.localhost/projects", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded",
        origin: "http://resources-edge.localhost" },
      body: new URLSearchParams({ csrf: createCsrf }),
    }));
  assert.equal(unauthenticatedCreate.status, 303);
  assert.equal(unauthenticatedCreate.headers.get("location"), "/login");
  const invalidCreateToken = await projectFormPost("/projects", {
    name: "Rejected", slug: "rejected", namespace: "user", template: "blank",
    visibility: "private", snapshot: JSON.stringify(first),
  }, "invalid", "/projects/new");
  assert.equal(invalidCreateToken.status, 303);
  assert.equal(invalidCreateToken.headers.get("location"), "/projects/new?error=form");
  const invalidCreateSnapshot = await projectFormPost("/projects", {
    name: "Rejected", slug: "rejected", namespace: "user", template: "blank",
    visibility: "private", snapshot: "{",
  }, createCsrf, "/projects/new");
  assert.equal(invalidCreateSnapshot.status, 303);
  assert.equal(invalidCreateSnapshot.headers.get("location"), "/projects/new?error=snapshot");
  const createdFormResponse = await projectFormPost("/projects", {
    name: "Form project", slug: "form-project", description: "Created by the server guest",
    namespace: "user", template: "blank", visibility: "private",
    snapshot: JSON.stringify(first),
  }, createCsrf, "/projects/new");
  assert.equal(createdFormResponse.status, 303, await createdFormResponse.clone().text());
  assert.equal(createdFormResponse.headers.get("location"), "/latte/form-project");
  const formProject = await content.getProject("latte", "form-project", account.id);
  assert.ok(formProject);

  const formProjectCsrf = await seal({
    v: 1, sub: account.id, action: `project:${formProject.id}`, exp: 100,
  }, secret);
  const updatedSnapshot = {
    files: [{ path: "index.html", content: "<h1>Published by the form route</h1>" }],
    config: {},
  };
  const updatedFormResponse = await projectFormPost(`/projects/${formProject.id}`, {
    name: "Renamed project", slug: "renamed-project", description: "Updated",
    namespace: "user", template: "blank", visibility: "public",
    snapshot: JSON.stringify(updatedSnapshot), versionTitle: "First publication",
  }, formProjectCsrf, "/latte/form-project");
  assert.equal(updatedFormResponse.status, 303, await updatedFormResponse.clone().text());
  assert.equal(updatedFormResponse.headers.get("location"), "/latte/renamed-project");
  const updatedWorkspace = await content.getProjectWorkspace("latte", "renamed-project", account.id);
  assert.deepEqual(updatedWorkspace.snapshot, updatedSnapshot);
  assert.equal(updatedWorkspace.hasUnpublishedChanges, false);
  assert.equal((await content.listProjectVersions(formProject.id, account.id))[0].title,
    "First publication");

  await content.saveProjectSnapshot(account.id, formProject.id, first, { reason: "periodic" });
  const revertedFormResponse = await projectFormPost(`/projects/${formProject.id}`, {
    intent: "revert",
  }, formProjectCsrf, "/latte/renamed-project");
  assert.equal(revertedFormResponse.status, 303, await revertedFormResponse.clone().text());
  assert.equal(revertedFormResponse.headers.get("location"), "/latte/renamed-project");
  assert.equal((await content.getProjectWorkspace("latte", "renamed-project", account.id))
    .hasUnpublishedChanges, false);

  const deletedFormResponse = await projectFormPost(`/projects/${formProject.id}`, {
    intent: "delete",
  }, formProjectCsrf, "/latte/renamed-project");
  assert.equal(deletedFormResponse.status, 303, await deletedFormResponse.clone().text());
  assert.equal(deletedFormResponse.headers.get("location"), "/projects");
  assert.equal(await content.getProject("latte", "renamed-project", account.id), null);

  const organization = await content.createOrganization(account.id, {
    slug: "coffee", name: "Coffee", description: "",
  });
  let identifier = 0;
  const organizations = createOrganizationStore(client, {
    now: () => createdAt, randomId: () => `notification-${++identifier}`,
  });
  await organizations.invite(organization.slug, account.id, { username: invited.login, role: "member" });
  const [notice] = await organizations.listNotifications(invited.id);
  const invitedSession = await seal({
    v: 1, sub: invited.id, login: invited.login, name: invited.name, iat: 1, exp: 100,
  }, secret);
  const csrf = await seal({ v: 1, sub: invited.id, action: "notifications", exp: 100 }, secret);
  async function notificationAction(intent) {
    return machine.handle(new Request(`http://resources-edge.localhost/notifications/${notice.id}`, {
      method: "POST",
      headers: {
        cookie: `resources_session=${invitedSession}`,
        "content-type": "application/x-www-form-urlencoded",
        origin: "http://resources-edge.localhost",
      },
      body: new URLSearchParams({ intent, csrf }),
    }));
  }
  const read = await notificationAction("read");
  assert.equal(read.status, 303, await read.clone().text());
  assert.equal((await organizations.listNotifications(invited.id))[0].read, true);
  const accepted = await notificationAction("accept");
  assert.equal(accepted.status, 303, await accepted.clone().text());
  assert.equal(accepted.headers.get("location"), "/coffee");
  const membership = await client.execute({
    sql: "SELECT role FROM resource_organization_members WHERE organization_id = ? AND user_id = ?",
    args: [organization.id, invited.id],
  });
  assert.equal(membership.rows[0].role, "member");
});
