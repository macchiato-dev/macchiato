# Canvas Lite

A small browser go-between for passing files to and from a sandboxed agent.
This is the beginning of the app, not a working file-transfer tool yet.

Each side has at least two WebAssembly instances: a trusted host and a sandboxed
guest, with separate memories. Thin JavaScript runners load only their host and
provide access to the surrounding environment. Each host loads and instantiates
its own guest through that access. This does not require
separate OS processes or browser workers.

- `frontend-host.rs`: communication layer and browser-side authority.
- `frontend-guest.rs`: sandboxed browser-side application logic.
- `backend-host.rs`: communication layer and server-side authority.
- `backend-guest.rs`: sandboxed server-side application logic.
- `frontend.js`: thin browser runner for the frontend host.
- `backend.js`: thin Deno runner for the backend host.

The guest imports only `host.msg(pointer, length)`. Its host supplies the bridge
that copies those bytes into a temporary host allocation, calls
`onmsg(pointer, length)`, and calls `free` (currently a no-op). There is no shared memory
or direct guest access to Deno, the DOM, the other guest, or JavaScript execution.
After instantiation, the host calls the guest's exported `run()` function. A
richer return-message ABI is not defined yet.

## Host function references

The host has two imports:

- `runner.compile(pointer, length)` takes a trusted JavaScript function expression
  and returns a reference to the compiled function.
- `runner.call(reference, pointer, length)` calls that function with the runner
  environment and the data range, returning a reference to its result.

References are indices in a per-host `WebAssembly.Table` of `externref` values,
created by the runner. They are not raw function pointers or references exposed
to the guest. Slot zero represents no result. The table also holds the startup
promise while the runner awaits it, then clears that slot. The scaffold registers
its functions only at startup; it does not yet implement general reference reuse.

Source is compiled once using the JavaScript `Function` constructor, not evaluated
on each call. Calls carry data separately and reuse the retained function. This
still requires permission for dynamic JavaScript compilation in a browser CSP;
it is not a claim to avoid JavaScript compilation altogether. Only trusted host
code gets this capability. Guest messages never become function source.

The functions can use the runner environment's full authority, within Deno's
granted permissions or the browser's normal origin restrictions. This is not a
sandbox for the host. The start task grants only the permissions the scaffold
currently uses; it does not yet grant subprocess execution. HTTP serving and
guest instantiation now live in the backend host's registered startup function,
not as application-specific logic in the runner.

The table lives on the runner side for now, so no Wasm transformation or Walrus
dependency is necessary. Hosts and guests remain independently built: adding
host-side dependencies later need not add them to a guest.

Communication with the external sandboxed agent will use only process exec;
that command and protocol remain undefined. Function registration above is not
that future agent transport.

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

## Inline allocation

Each Rust file contains a byte arena starting at the linker's `__heap_base`.
`alloc(length)` checks for overflow and grows linear memory in 64 KiB pages when
needed. `free(pointer, length)` is a no-op, with no ordering requirement.
The host uses this for temporary message copies instead of a fixed-size inbox.
Each guest also exports the allocator, ready for its own buffers.

This is a byte-buffer allocator, not an aligned Rust `GlobalAlloc` or a general
heap. Allocations keep advancing and remain allocated for the lifetime of the
VM; there is no reset or reuse yet. Callers should still stop using a buffer
after calling `free`, so a later allocator can reclaim it. Repeated messages
will grow memory until a reuse policy is added. No libc, allocator crate, or
shared allocator module is involved. The message interface and memory policy
are still scaffolding, not the eventual file-transfer design.

References: [WebAssembly tables](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Table/Table)
and [Rust's Wasm memory growth intrinsic](https://doc.rust-lang.org/core/arch/wasm32/fn.memory_grow.html).
