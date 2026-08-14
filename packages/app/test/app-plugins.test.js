import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { getSiteRoute } from "@macchiato-dev/site";
import { initSqliteStore, listAppConfigRows, setAppEnvironmentValue, upsertAppConfig } from "@macchiato-dev/app-db-sqlite";
import { getDeclarativeApp } from "../src/declarative-apps.js";
import { initializeAppsIfEmpty, installAppPlugins } from "../src/app-plugins.js";

test("a fresh registry initializes only the core app directory", () => {
  const db = new DatabaseSync(":memory:");
  initSqliteStore(db);

  assert.deepEqual(initializeAppsIfEmpty(db), ["apps"]);
  assert.equal(listAppConfigRows(db).length, 1);
  assert.equal(getDeclarativeApp(db, "").handlerName, "app-directory");
  assert.deepEqual(initializeAppsIfEmpty(db), []);
});

test("plugins install dependencies with overridable, recorded subdomains", () => {
  const db = new DatabaseSync(":memory:");
  initSqliteStore(db);

  assert.deepEqual(installAppPlugins(db, ["resources-edge"], {
    mappings: {
      "resources-co": "resources-source",
      "resources-edge": "resources-preview",
    },
  }), ["resources-co", "blog-examples", "resources-edge"]);

  const edge = getDeclarativeApp(db, "resources-preview");
  assert.equal(edge.options.plugin, "resources-edge");
  assert.deepEqual(edge.dependencies, { "resources-co": "resources-source", "blog-examples": "blog-examples" });
  assert.equal(edge.environmentSchema.GITLAB_CLIENT_SECRET.secret, true);
  setAppEnvironmentValue(db, "resources-preview", "GITLAB_CLIENT_ID", "configured-id");
  assert.deepEqual(getDeclarativeApp(db, "resources-preview").environment, { GITLAB_CLIENT_ID: "configured-id" });
  assert.ok(getSiteRoute(db, "resources-source", "/"));
  assert.equal(getDeclarativeApp(db, "resources-edge"), null);
});

test("plugins persist inspectable CLI contracts without executable functions", () => {
  const db = new DatabaseSync(":memory:");
  initSqliteStore(db);
  installAppPlugins(db, ["focused-app"]);

  const app = getDeclarativeApp(db, "app");
  assert.deepEqual(app.commands, { export: { description: "Export the app as a static directory." } });
  assert.equal(JSON.stringify(app.options).includes("exportFocusedApp"), false);
});

test("the todo source hostname resolves through the declarative DOM Use Todos app", () => {
  const db = new DatabaseSync(":memory:");
  initSqliteStore(db);
  installAppPlugins(db, ["dom-use-todos"]);

  const canonical = getDeclarativeApp(db, "dom-use-todos");
  const alias = getDeclarativeApp(db, "todo");
  assert.equal(alias.subdomain, canonical.subdomain);
  assert.equal(alias.handlerName, canonical.handlerName);
  assert.deepEqual(alias.aliases, ["todo"]);
});

test("installing a renamed plugin removes its obsolete declarative app", () => {
  const db = new DatabaseSync(":memory:");
  initSqliteStore(db);
  upsertAppConfig(db, {
    subdomain: "vue-dom-editor",
    name: "Previous editor experiment",
    kind: "sandbox",
    description: "Replaced plugin",
    handler: "code:vue-dom-editor",
  });
  installAppPlugins(db, ["virtual-dom-editor"]);

  assert.equal(getDeclarativeApp(db, "virtual-dom-editor").options.plugin,
    "virtual-dom-editor");
  assert.equal(getDeclarativeApp(db, "vue-dom-editor"), null);
});
