import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { getSiteRoute } from "@macchiato-dev/site";
import { initSqliteStore, listAppConfigRows, setAppEnvironmentValue } from "@macchiato-dev/app-db-sqlite";
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
