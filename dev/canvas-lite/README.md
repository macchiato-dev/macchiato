# Canvas Lite

A small browser go-between for passing files to and from a sandboxed agent.
This is the beginning of the app, not a working file-transfer tool yet.

Frontend and backend application logic will run in WebAssembly. The JavaScript
files provide browser and Deno I/O. Communication with the sandboxed agent will
use only exec; the command and its input/output protocol are not defined yet.

- `frontend.rs`: browser-side application logic.
- `backend.rs`: server-side application logic.
- `frontend.js`: browser host for the frontend Wasm.
- `backend.js`: dependency-free Deno server and backend Wasm host.

For now the backend Wasm supplies a minimal HTML page and the frontend Wasm
supplies its introductory text. There is no agent execution, file handling,
persistence, or authentication yet. The server listens only on loopback.

## Build and run

Requires Deno and Rust with the `wasm32-unknown-unknown` target installed:

```sh
rustup target add wasm32-unknown-unknown
deno task build
deno task start
```

Open <http://localhost:8788/>. The build uses `rustc` directly, with no Rust
dependencies, standard library, WASI, or binding generator. Both outputs target
only `wasm32-unknown-unknown`. Generated files go in ignored `dist/`.

The initial ABI is just exported memory and a UTF-8 pointer/length pair. It is a
scaffold, not a decision about the eventual file-transfer interface.
