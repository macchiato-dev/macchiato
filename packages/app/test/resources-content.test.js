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

async function stores() {
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
  return { account, content: createContentStore(client, { now: () => 200, randomId: () => `content-${++id}` }) };
}

test("content store creates organizations and namespaced projects", async () => {
  const { account, content } = await stores();
  const organization = await content.createOrganization(account.id, {
    slug: "tiny-tools",
    name: "Tiny Tools",
    description: "Small things.",
  });
  await content.createProject(account.id, {
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
