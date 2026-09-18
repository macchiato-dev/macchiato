# Canvas Lite

A small browser go-between for passing files to and from a sandboxed agent.
This is the beginning of the app, not a working file-transfer tool yet.

Each side has at least two WebAssembly instances: a trusted host and a sandboxed
guest, with separate memories. Thin JavaScript runners connect them and provide
the host with access to the surrounding environment. This does not require
separate OS processes or browser workers.

- `frontend-host.rs`: communication layer and browser-side authority.
- `frontend-guest.rs`: sandboxed browser-side application logic.
- `backend-host.rs`: communication layer and server-side authority.
- `backend-guest.rs`: sandboxed server-side application logic.
- `frontend.js`: thin browser runner for both frontend instances.
- `backend.js`: dependency-free Deno server and runner for both backend instances.

The guest imports only `host.msg(pointer, length)`. The runner copies those bytes
into its host's inbox and calls `onmsg(length)`. There is no shared memory or
direct guest access to Deno, the DOM, the other guest, or JavaScript execution.
The host initiates the guest through `guest.run()`; a richer return-message ABI
is not defined yet.

The host imports `runner.exec`, which executes **trusted host-authored** JavaScript
with guest data supplied as a separate argument, not interpolated into code.
This gives the host full access to the runner environment, within Deno's granted
permissions or the browser's normal origin restrictions. It is not a sandbox for
the host. The start task grants only the permissions this scaffold currently
uses; it does not yet grant subprocess execution.

Communication with the external sandboxed agent will use only process exec;
that command and protocol remain undefined. `runner.exec` above is JavaScript
execution by the trusted host, not that future agent transport.

For now the backend guest supplies a minimal HTML page through its host, and the
frontend guest supplies introductory text through its host. The HTML is a trusted
fixture, not yet a safe renderer for arbitrary guest HTML. There is no file
handling, agent execution, persistence, or authentication yet. The server listens
only on loopback.

## Build and run

Requires Deno and Rust with the `wasm32-unknown-unknown` target installed:

```sh
rustup target add wasm32-unknown-unknown
deno task build
deno task start
```

Open <http://localhost:8788/>. The build uses `rustc` directly, with no Rust
dependencies, standard library, WASI, or binding generator. All four outputs target
only `wasm32-unknown-unknown`. Generated files go in ignored `dist/`.

The initial inbox holds 4096 bytes of UTF-8 text. It is a scaffold, not a decision
about the eventual file-transfer interface, size limits, or binary encoding.
