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

The current concatenated ES5 build is a compatibility milestone, not the
authoring model to preserve. The intended runtime is a hybrid of MicroQuickJS,
full QuickJS, and narrow host calls. It will support a documented ES6 subset:
small control paths can remain in MicroQuickJS, intricate language operations
can execute in QuickJS, and safe deterministic functions can be called through
the host instead of being copied into either interpreter. The split must not
grant ambient host authority or make the same operation acquire subtly
different semantics in each engine.

Source remains the authoritative, reviewable artifact. If runtime-specific
bytecode is cached, the cache will be reproducible, versioned by its compiler
and runtime inputs, and disposable in the same spirit as Python's `.pyc`
files. Builds should expose the source-to-cache relationship and hashes rather
than presenting bytecode as an opaque replacement for source. `QuickJSmax` and
`Denomax` profiles may later provide broader facilities without increasing the
minimal hybrid runtime.

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
## QuickJS server runtime

`quickjs-server` runs ordinary asynchronous application code. A device call
returns a guest Promise; the host performs the capability operation, delivers
the result through `onmsg`, and QuickJS drains its pending-job queue before
returning the application response. Both runtimes use the same typed
`msg`/`onmsg` server bridge, so selecting the larger application runtime does
not grant it additional host authority.
