# @macchiato-dev/http-use

`http-use` is a schema boundary between HTTP backends and browser frontends.
It is deliberately not a web framework. It describes named operations, validates
their JSON inputs, projects their JSON outputs, and gives a browser only the
method/path pairs it is allowed to call.

## Two adapters

The package currently exposes two related interfaces:

- `HttpUse` accepts Fetch API `Request` objects. This is convenient for native
  Macchiato handlers and other Web-standard servers.
- `createHttpUseHandler` from `@macchiato-dev/http-use/backend` accepts the small
  Node request/response interface shared by real Node and the QuickJS host adapter.

Both enforce the same rule: response properties absent from the response schema
do not cross the boundary. Filtering happens on the backend, not in browser code.

```js
import { createHttpUseHandler } from "@macchiato-dev/http-use/backend";

const handler = createHttpUseHandler({
  operations: {
    list: {
      method: "GET",
      path: "/api/items",
      response: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "integer" }, title: { type: "string" } },
        },
      },
      run: () => database.prepare("SELECT * FROM items").all(),
    },
  },
});
```

If the rows also contain `internal_token`, it is omitted before serialization.

## Backend and frontend combinations

HTTP is the stable seam, so backend and frontend execution do not have to use the
same runtime:

| Backend | Frontend | Intended use |
| --- | --- | --- |
| QuickJS/WASM with host capabilities | QuickJS/WASM state sandbox | Strong local capability experiment |
| Native Node | QuickJS/WASM state sandbox | Conventional deployment with isolated guest UI logic |
| QuickJS/WASM with host capabilities | Native browser JavaScript | Sandboxed backend experiment with a conventional UI |
| Native Node or another HTTP server | Native browser JavaScript | Conventional application |

Only named operations and their JSON schemas should be shared with the frontend.
Database handles, SQL, host filesystem paths, and backend implementation details
must remain behind the HTTP boundary.

Future backend adapters might target Bun, Deno, a worker runtime, a remote service,
or a different database. Future frontends might use DOM Use, a framework, server
rendering, or no JavaScript. Keeping the operation document independent from both
sides makes those combinations possible.

## Portable backend experiment

See [`examples/http-sqlite-crud`](../../examples/http-sqlite-crud/README.md).
Its `backend.js` is evaluated unchanged in two modes:

1. QuickJS/WASM, where the host grants partial `node:http` and `node:sqlite` modules.
2. Native Node, where those imports resolve to the real built-ins.

This is the current form of the “one shot in a sandbox, then run on a server”
workflow. Portability is tested, but the Node compatibility surface is intentionally
small and documented below rather than claimed to be complete.

## Current schema scope

The schema projector supports JSON objects, arrays, strings, booleans, and
integers, plus object `required` fields. Unknown object properties are removed.
It is not yet a complete JSON Schema implementation. In particular, it does not
currently implement unions, numeric ranges, string lengths, formats, recursive
references, streaming bodies, multipart data, or response headers in operation
configuration.
