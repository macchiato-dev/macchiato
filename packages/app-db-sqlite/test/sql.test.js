import assert from "node:assert/strict";
import test from "node:test";
import {
  createTable,
  insert,
  literal,
  querySql,
  quoteIdentifier,
  quoteLiteral,
  schemaSql,
  select,
} from "../src/sql.js";

test("sql builders validate identifiers without excessive quoting", () => {
  assert.equal(quoteIdentifier("site_pages"), "site_pages");
  assert.throws(() => quoteIdentifier("site_pages; DROP TABLE sites"), /Invalid SQL identifier/);
  assert.throws(() => select({ from: "site-pages", columns: ["subdomain"] }), /Invalid SQL identifier/);
  assert.throws(() => insert({ into: "sites", columns: ["subdomain", "bad column"] }), /Invalid SQL identifier/);

  assert.equal(quoteLiteral("raw user's site"), "'raw user''s site'");
  assert.match(querySql.siteLists.configuredRawFiles, /'raw site' AS kind/);
  assert.doesNotMatch(querySql.siteLists.configuredRawFiles, /"site_files"/);
});

test("schema sql is generated from declarative table definitions", () => {
  assert.match(schemaSql.appConfigs, /CREATE TABLE IF NOT EXISTS app_configs/);
  assert.match(schemaSql.appConfigs, /permissions_json TEXT NOT NULL DEFAULT '\{\}' CHECK \(json_valid\(permissions_json\)\)/);
  assert.match(schemaSql.appConfigs, /directory INTEGER NOT NULL DEFAULT 1 CHECK \(directory IN \(0, 1\)\)/);
  assert.throws(() => createTable({ name: "bad table", columns: [] }), /Invalid SQL identifier/);
  assert.equal(
    select({ from: "sites", columns: ["subdomain", literal("directory", "kind")] }),
    "SELECT subdomain, 'directory' AS kind FROM sites",
  );
});
