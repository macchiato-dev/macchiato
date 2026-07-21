# HTTP Use + SQLite portable CRUD backend

This example is an architecture probe for a small application that can run with
or without a server-side JavaScript sandbox.

`backend.js` is ordinary module source. It imports `createServer` from
`node:http`, `DatabaseSync` from `node:sqlite`, and the Node-style HTTP schema
adapter from `@macchiato-dev/http-use/backend`. The file is not rewritten for
either runtime.

## Run inside QuickJS/WASM

From the repository root:

```bash
node packages/app/src/index.js \
  --data-dir /tmp/macchiato-http-use-review \
  --host 127.0.0.1 \
  --port 8765
```

Open:

```text
http://sqlite-notes.localhost:8765
```

In this mode there are two sandboxes with different jobs:

```text
browser DOM
  -> browser QuickJS state reducer
  -> HttpUseClient named operation
  -> HTTP
  -> server QuickJS backend.js
  -> host-provided node:sqlite capability
  -> dedicated SQLite database
```

The server-side `node:http` adapter maps the guest server to the Macchiato
subdomain route rather than opening another operating-system socket.

## Run the same backend directly under Node

```bash
node examples/http-sqlite-crud/server.js \
  --port 8787 \
  --db /tmp/http-use-notes.sqlite3
```

Inspect it with:

```bash
curl http://127.0.0.1:8787/api/config
curl http://127.0.0.1:8787/api/notes
curl -H 'content-type: application/json' \
  -d '{"title":"Review native mode"}' \
  http://127.0.0.1:8787/api/notes
```

Here Node provides its actual `node:http` and `node:sqlite` modules. The wrapper
only sets the port and database globals before importing `backend.js`.

## Files worth reviewing

- `backend.js`: the portable backend and operation schemas.
- `handler.js`: server-side WASM host capabilities and routing adapter.
- `client.js`: trusted browser orchestration and HTTP pass-through.
- `sandbox.js`: untrusted browser state and allowed operation selection.
- `packages/http-use/src/backend.js`: shared Node-style schema boundary.
- `packages/quickjs-emscripten-sandbox/src/index.js`: partial Node module sources.

The database deliberately contains an `internal_token` column. The list and
mutation queries select it, but the response schema does not. Tests assert that
it never reaches the browser. This makes the schema boundary observable rather
than merely conventional.

## Tests

```bash
node --test \
  packages/app/test/http-sqlite-crud.test.js \
  packages/app/test/http-sqlite-crud.browser.test.js \
  packages/http-use/test/http-use.test.js \
  packages/quickjs-emscripten-sandbox/test/module-loader.test.js
```

The Playwright test creates, completes, and deletes a note through the browser
and server WASM sandboxes. A second test starts `server.js` as a native Node
process and calls the same API.

## Questions for architecture feedback

When reviewing, focus on:

1. Is the partial Node surface the right authoring API, or should portable apps
   depend on explicit `http-use` and `sqlite-use` interfaces instead?
2. Should a sandbox `listen()` map to an existing route, request a new socket,
   or be prohibited unless separately granted?
3. Should operation schemas be authored beside handlers as they are now, or be
   stored independently so multiple backends can implement the same contract?
4. Which side should own authentication, transactions, migrations, streaming,
   and binary data?
5. Should production sandbox databases be one file per app, attached schemas in
   a shared file, or a storage interface with SQLite as only one backend?

Those decisions should be made before using the pattern for the Resources.co
revamp.

## Important limits before production use

- The QuickJS runtime does not yet set a per-request CPU deadline or memory cap.
- SQL is unrestricted inside the granted dedicated database. Isolation currently
  comes from granting a separate database, not from parsing or allow-listing SQL.
- The guest HTTP handler must finish synchronously. Request `data` and `end`
  callbacks are emulated, but promises, streaming responses, and background work
  are not drained by the host dispatcher.
- `listen()` is semantic rather than literal in sandbox mode: it registers the
  guest handler with an already-running Macchiato route. Native mode opens a real
  socket.
- Operation definitions contain executable handler functions. There is not yet a
  separately signed or versioned interface document that another backend can
  independently implement.
- Authentication, authorization, migrations, transaction policy, request size
  limits, concurrency behavior, and cancellation remain open design work.

The example is suitable for architecture review and CRUD experiments, not yet as
a claim of production isolation.
