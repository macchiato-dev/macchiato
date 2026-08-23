# wwm-js-runtimes

`wwm-js-runtimes` provides selectable execution engines for
`wasm-web-container`:

- MicroQuickJS for small bytecode applications;
- QuickJS and QuickJS-NG for intricate existing JavaScript;
- Porffor for ahead-of-time JavaScript compilation;
- AssemblyScript for ahead-of-time TypeScript-like applications.

The package keeps runtime selection separate from the machine and controller.
Each implementation may expose JavaScript-source loading, resource-bundle
loading, or both. It owns runtime-specific compilation, bytecode, contexts,
and lifecycle behavior while the container owns fetching and validates the
application input.

## MicroQuickJS server runtime

`microquickjs-server` is the small, non-DOM runtime used by server controllers.
Its JavaScript application receives typed messages from `server-use`; the C
boundary only decodes and encodes the machine wire format. It therefore runs
route decisions inside MicroQuickJS without exposing Requests, database
clients, sockets, or other server objects to JavaScript.

The server build accepts repeated `--runtime` and `--application` arguments.
It concatenates runtime slices first and application slices second, preserving
the command-line order and inserting only readable boundary comments,
semicolon separators, and newlines. It rejects module declarations and passes
the resulting plain script directly to `mqjs`; there is no guest module loader
or general-purpose bundler.

This permits deliberately different builds. A minimal server can use concise,
hand-written ES5 and no optional runtime slices. A larger build can select a
QuickJS-oriented runtime, while future `QuickJSmax` and `Denomax` profiles can
provide broader facilities without increasing the minimal artifact. Guest code
that benefits from richer authoring may instead be written in TypeScript,
checked normally, lowered to ES5 with Babel, and then supplied as one of the
ordered inputs. The generated concatenated ES5 remains the auditable source
that MicroQuickJS compiles.

For example:

```sh
node microquickjs-server/build.js \
  --source-root "$PWD" \
  --runtime guest/http.js \
  --application guest/routes.js \
  --application guest/policy.js \
  --guest-output generated/server.guest.js \
  --output generated/server.wasm
```

Host controllers remain TypeScript. They instantiate a selected machine,
grant narrow devices, and relay messages; application and runtime variation
belongs to the guest build.

The existing development runtime trees will move here incrementally. Their
source history and runnable examples should remain useful during the move;
this directory is not a second implementation or a wrapper around `dev/`.
