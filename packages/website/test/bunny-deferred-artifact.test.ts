import { DatabaseSync } from "node:sqlite";
import { createAccountStore } from "../../hub/src/accounts.js";
import { createNodeSqliteClient } from "../adapters/node-sqlite-client.js";
import { seal } from "../auth/session.js";

// The real bundled libSQL client speaks Hrana v2 to this in-memory fixture.
// This deliberately supports only the protocol operations used by the app;
// it is not an implementation intended for serving a database. Wire shapes
// follow @libsql/hrana-client's http/shared json_encode/json_decode modules.
function databaseTransport(database: DatabaseSync) {
  const statements: string[] = [];
  const streams = new Map<string, Map<number, string>>();
  function decode(value: any): any {
    if (value.type === "null") return null;
    if (value.type === "integer") return BigInt(value.value);
    if (value.type === "text" || value.type === "float") return value.value;
    throw new Error(`Unexpected SQL parameter type: ${value.type}`);
  }
  function encode(value: any): any {
    if (value === null) return { type: "null" };
    if (typeof value === "bigint") return { type: "integer", value: String(value) };
    if (typeof value === "number") return Number.isInteger(value)
      ? { type: "integer", value: String(value) } : { type: "float", value };
    if (typeof value === "string") return { type: "text", value };
    throw new Error("Unexpected SQL result type");
  }
  function execute(input: any, stored: Map<number, string>) {
    if (input.sql_id !== undefined) input = { ...input, sql: stored.get(input.sql_id) };
    assert(typeof input.sql === "string", "Expected inline SQL");
    assert(!input.named_args?.length, "Named SQL arguments not implemented in this fixture");
    statements.push(input.sql);
    const statement = database.prepare(input.sql);
    statement.setReadBigInts(true);
    const cols = statement.columns().map(column => ({ name: column.name, decltype: column.type }));
    const args = (input.args || []).map(decode);
    if (cols.length) {
      const rows = statement.all(...args).map(row => cols.map(column => encode(row[column.name])));
      return { cols, rows: input.want_rows === false ? [] : rows, affected_row_count: 0, last_insert_rowid: null };
    }
    const result = statement.run(...args);
    return { cols, rows: [], affected_row_count: Number(result.changes), last_insert_rowid: String(result.lastInsertRowid) };
  }
  function condition(value: any, results: any[], errors: any[]): boolean {
    if (!value) return true;
    if (value.type === "ok") return results[value.step] != null;
    if (value.type === "error") return errors[value.step] != null;
    if (value.type === "not") return !condition(value.cond, results, errors);
    if (value.type === "and") return value.conds.every((item: any) => condition(item, results, errors));
    if (value.type === "or") return value.conds.some((item: any) => condition(item, results, errors));
    throw new Error(`Unexpected batch condition: ${value.type}`);
  }
  return {
    statements,
    async fetch(request: Request) {
      const url = new URL(request.url);
      if (url.pathname === "/v3-protobuf") return new Response(null, { status: 404 });
      assert(url.pathname === "/v2/pipeline" && request.method === "POST", "Unexpected database transport");
      const body = await request.json();
      const baton = body.baton || crypto.randomUUID();
      const stored = body.baton ? streams.get(baton) : new Map<number, string>();
      assert(stored, "Unknown database stream");
      streams.set(baton, stored);
      let closed = false;
      const results = body.requests.map((entry: any) => {
        let response;
        if (entry.type === "close") { closed = true; response = { type: "close" }; }
        else if (entry.type === "store_sql") {
          stored.set(entry.sql_id, entry.sql); response = { type: "store_sql" };
        } else if (entry.type === "close_sql") {
          stored.delete(entry.sql_id); response = { type: "close_sql" };
        } else if (entry.type === "execute") response = { type: "execute", result: execute(entry.stmt, stored) };
        else if (entry.type === "batch") {
          const step_results: any[] = [], step_errors: any[] = [];
          for (const step of entry.batch.steps) {
            let result = null, error = null;
            if (condition(step.condition, step_results, step_errors)) {
              try { result = execute(step.stmt, stored); }
              catch (failure) { error = { message: String(failure), code: "SQLITE_ERROR" }; }
            }
            step_results.push(result); step_errors.push(error);
          }
          response = { type: "batch", result: { step_results, step_errors } };
        } else throw new Error(`Unexpected database operation: ${entry.type}`);
        return { type: "ok", response };
      });
      if (closed) streams.delete(baton);
      return Response.json({ baton: closed ? null : baton, base_url: null, results });
    },
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

for (const interrupted of [false, true]) Deno.test(`exported Bunny deferred routes${interrupted ? " recover after a database outage" : " initialize once"}`, async () => {
  assert(Deno.args[0], "Pass the resources-bunny export directory");
  const root = new URL("file:///");
  root.pathname = `${await Deno.realPath(Deno.args[0])}/`;
  const database = new DatabaseSync(":memory:");
  const sql = databaseTransport(database);
  const env = {
    BUNNY_STORAGE_ORIGIN: "https://storage.example.test/bucket",
    STORAGE_API_KEY: "fixture-storage-key",
    BUNNY_DATABASE_URL: "https://database.example.test",
    BUNNY_DATABASE_AUTH_TOKEN: "fixture-write-key",
    BUNNY_DATABASE_READ_ONLY_AUTH_TOKEN: "fixture-read-key",
    PUBLIC_ORIGIN: "https://staging.resources.co",
    SESSION_SIGNING_KEY: "fixture-only-session-signing-secret-at-least-32-characters",
    GITHUB_CLIENT_ID: "fixture-client", GITHUB_CLIENT_SECRET: "fixture-secret",
    GITLAB_CLIENT_ID: "fixture-client", GITLAB_CLIENT_SECRET: "fixture-secret",
    SIGNUPS_ENABLED: "true",
  };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, Deno.env.get(key)]));
  const originalFetch = globalThis.fetch, originalServe = Deno.serve;
  type Handler = (request: Request) => Promise<Response>;
  let handler: Handler | undefined;
  const storage: string[] = [], tokens = new Set<string>();
  let failDatabase = interrupted;
  const errors: string[] = [];
  const originalError = console.error;
  try {
    for (const [key, value] of Object.entries(env)) Deno.env.set(key, value);
    console.error = (...args) => errors.push(args.map(String).join(" "));
    Deno.serve = ((_options: unknown, callback: Handler) => { handler = callback; return {}; }) as typeof Deno.serve;
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init), url = new URL(request.url);
      if (url.origin === "https://database.example.test") {
        const token = request.headers.get("authorization") || "";
        assert(["Bearer fixture-write-key", "Bearer fixture-read-key"].includes(token), "Wrong database credential");
        tokens.add(token);
        if (failDatabase) {
          failDatabase = false;
          return new Response("Temporary database outage", { status: 503 });
        }
        try { return await sql.fetch(request); }
        catch (error) { errors.push(`Database fixture: ${String(error)}`); throw error; }
      }
      assert(url.origin === "https://storage.example.test", `Unexpected external request: ${url.origin}`);
      assert(request.headers.get("AccessKey") === env.STORAGE_API_KEY, "Wrong Storage key");
      assert(/^\/bucket\/resources-co-[a-f0-9]+\//.test(url.pathname) && !url.pathname.includes(".."), "Invalid Storage path");
      storage.push(url.pathname);
      try {
        return new Response(await Deno.readFile(new URL(`site/${url.pathname.slice("/bucket/".length)}`, root)));
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) throw error;
        return new Response(null, { status: 404 });
      }
    };
    await import(new URL(`edge/script.ts?deferred=${crypto.randomUUID()}`, root).href);
    const serve = handler as Handler | undefined;
    assert(serve && storage.length === 0 && sql.statements.length === 0, "Entry must register before deferred work");
    if (interrupted) {
      const failed = await serve(new Request(env.PUBLIC_ORIGIN + "/blog"));
      assert(failed.status === 503, "The unavailable database should fail the initial request");
      assert(errors.length > 0, "Initialization failure should be logged");
      errors.length = 0;
    }
    for (const path of ["/blog", "/try/article", "/-/resources-site/controller.js"]) {
      const response = await serve(new Request(env.PUBLIC_ORIGIN + path));
      assert(response.status === 200, `${path}: ${response.status}; ${errors.join("; ")}; SQL calls: ${sql.statements.length}; last SQL: ${sql.statements.at(-1)}`);
      const body = await response.text();
      assert(body.length > 100, `${path} returned an empty body`);
    }
    assert(storage.filter(path => path.endsWith("/machines/backend.bin")).length === 1, "Deferred artifact should be shared");
    const migrations = database.prepare("SELECT * FROM resource_schema_migrations").all();
    assert(migrations.length > 0, "Deferred initialization did not record migrations");
    const initialization = sql.statements.filter(sql => /CREATE TABLE|INSERT OR IGNORE INTO resource_schema_migrations/i.test(sql)).length;
    const response = await serve(new Request(env.PUBLIC_ORIGIN + "/blog"));
    assert(response.status === 200, "Warm deferred request failed");
    assert(sql.statements.filter(sql => /CREATE TABLE|INSERT OR IGNORE INTO resource_schema_migrations/i.test(sql)).length === initialization,
      "Warm request reinitialized the database");

    // Seed only the identity. Project creation, validation, history and saves
    // below all go through the uploaded controller and its actual guests.
    const account = await createAccountStore(createNodeSqliteClient(database)).authenticateIdentity({
      provider: "github", providerUserId: "artifact-user", login: "artifact-user",
      name: "Artifact User", email: "artifact@example.test", emailVerified: true,
    });
    const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name,
      iat: Date.now(), exp: Date.now() + 60_000 }, env.SESSION_SIGNING_KEY);
    const cookie = `__Host-resources_session=${session}`;
    async function authenticated(path: string, init: RequestInit = {}) {
      const headers = new Headers(init.headers);
      headers.set("cookie", cookie);
      if (init.method === "POST") headers.set("origin", env.PUBLIC_ORIGIN);
      return serve!(new Request(env.PUBLIC_ORIGIN + path, { ...init, headers }));
    }
    async function formToken(path: string) {
      const page = await authenticated(path);
      assert(page.status === 200, `${path} did not render: ${page.status}; ${errors.join("; ")}`);
      const html = await page.text();
      const token = html.match(/name="csrf" value="([^"]+)"/);
      assert(token, `No CSRF token in ${path}`);
      return token[1];
    }
    const snapshot = { files: [{ path: "index.html", content: "<h1>Artifact project</h1>" }], config: { entry: "index.html" } };
    const created = await authenticated("/projects", {
      method: "POST", body: new URLSearchParams({
        csrf: await formToken("/projects/new"), name: "Artifact project", slug: "artifact-project",
        namespace: "user", template: "blank", visibility: "private", snapshot: JSON.stringify(snapshot),
      }),
    });
    assert(created.status === 303 && created.headers.get("location") === "/artifact-user/artifact-project",
      `Project creation failed: ${created.status}, ${created.headers.get("location")}; ${errors.join("; ")}`);
    const project = database.prepare("SELECT id FROM resource_projects WHERE slug = ?").get("artifact-project");
    assert(project, "Project was not stored");
    const csrf = await formToken("/artifact-user/artifact-project");
    const edited = { ...snapshot, files: [{ path: "index.html", content: "<h1>Saved through Bunny entry</h1>" }] };
    const saved = await authenticated(`/api/projects/${project.id}/snapshot`, {
      method: "POST", headers: { "content-type": "application/json", "x-resources-csrf": csrf },
      body: JSON.stringify({ snapshot: edited, manual: true }),
    });
    assert(saved.status === 200, `Save failed: ${saved.status}; ${await saved.clone().text()}; ${errors.join("; ")}`);
    assert(JSON.stringify((await saved.json()).snapshot) === JSON.stringify(edited), "Save returned a different snapshot");
    const workspace = await authenticated("/-/projects/artifact-user/artifact-project/workspace");
    assert(workspace.status === 200 && JSON.stringify((await workspace.json()).snapshot) === JSON.stringify(edited), "Workspace did not retain the saved edit");
    const versions = await authenticated(`/api/projects/${project.id}/versions`);
    assert(versions.status === 200 && (await versions.json()).versions.length === 2, "Save did not create exactly one version");
    const denied = await authenticated(`/api/projects/${project.id}/snapshot`, {
      method: "POST", headers: { "content-type": "application/json", "x-resources-csrf": "invalid" },
      body: JSON.stringify({ snapshot, manual: true }),
    });
    assert(denied.status === 403, "Invalid save authorization was not rejected");
    assert(tokens.size === 2, "Both read and write clients should be exercised");
    assert(errors.length === 0, errors.join("; "));
  } finally {
    globalThis.fetch = originalFetch; Deno.serve = originalServe; console.error = originalError;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value);
    }
    database.close();
  }
});
