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
After instantiation, the host calls the guest's exported `run()` function. The
backend guest requests argv, selects its mode, and handles the small protocol
described below. A general return-message ABI is not defined yet.

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
sandbox for the host. The start task grants the server permission to launch Deno;
the child agent receives no network or subprocess permission. HTTP serving and
guest instantiation now live in the backend host's registered startup function,
not as application-specific logic in the runner.

The table lives on the runner side for now, so no Wasm transformation or Walrus
dependency is necessary. Hosts and guests remain independently built: adding
host-side dependencies later need not add them to a guest.

Communication with the agent uses only process exec and stdin/stdout. The local
mode is implemented; entering a separate sandbox uses an operator-supplied exec
command. Function registration above is distinct from that process transport.

For now the agent process's backend guest supplies a minimal HTML page through
the pipes, and the frontend guest supplies introductory text through its host.
The HTML is a trusted fixture, not yet a safe renderer for arbitrary guest HTML.
There is no canvas file handling, persistence, authentication, or AI model client
yet. The server listens only on loopback. The agent is a canvas endpoint, not a
new AI session.

## Current exec/proxy slice

`deno task start` runs the server with this child command after `--`:

```sh
deno run --allow-read=dist backend.js agent
```

Both processes instantiate their own backend host and guest Wasm pair. The
backend guest receives argv as a u32 little-endian count followed by
u32-length-prefixed UTF-8 arguments. It selects `agent` for that single argument,
or server mode when argv starts with `--` followed by a nonempty executable.
Other forms fail with usage information. The host keeps the original argv for
spawning; it does not interpret it as a shell command.

The backend guest-to-host messages currently begin with one byte:

| Byte | Meaning |
| --- | --- |
| 0 | Request argv; host replies through the guest's `arguments` export. |
| 1 | Run the stdin/stdout canvas agent. |
| 2 | Run the web server and configured child. |
| 3 | Reject the invocation or unsupported agent input. |
| 4 | Remaining bytes are the placeholder HTML response. |
| 5 | Exchange a page request with the child. |

The **process pipe** protocol is separate: request byte `0` asks for the page;
the response is a u32 little-endian byte length followed by the HTML bytes.
Stdout carries only this protocol; diagnostics use stderr. Replies are currently
capped at 1 MiB, requests time out after ten seconds, and only one page exchange
is allowed at a time. This is a starter endpoint, not the file-transfer protocol.

The declarative `canvas-lite` app uses the existing generic `proxy` handler,
forwarding paths, queries, methods, and bodies to `http://127.0.0.1:8788`.
There is no Canvas-specific gateway code and no shared-asset route. Frontend
assets come from this server; the root page comes from the agent. From the
repository root, install the declaration with:

```sh
node packages/macchiato/src/macchiato.js app install canvas-lite
```

With the gateway on port 3030, open <http://canvas-lite.localhost:3030/>.
The fixed upstream port is for this initial proxy setup. Random-port/path launch
authentication below is still a design sketch. Do not expose canvas files or
mutations before implementing access control.

## Sketch: agent-owned canvas

The canvas lives in the agent's environment:

- `~/canvas-lite/canvas.md` is the canvas document.
- Other files may live at any other path beneath `~/canvas-lite/`, including
  subdirectories. There is no required assets-only directory.
- `~` means the agent's home directory, not the browser server operator's home.

This directory is the source of truth. The agent can edit it with its ordinary
file tools, while the browser reads and edits it through the exec connection.
The browser is not maintaining a separate authoritative canvas database. File
handoffs into the canvas land beneath this directory; exports come back through
the same connection. References in the document should be relative to this root.

The browser presents an **infinite canvas**, with pan and zoom rather than a
fixed page. HTML custom elements provide the visual components. Initial
essentials are:

- Code snippets with syntax highlighting.
- Image previews.
- Freehand drawing.
- Shapes.
- Text.

The document will describe the items, their placement, and references to files.
The exact Markdown representation, element names, and interaction model remain
to be designed. Use readable document data rather than making the browser DOM
the persistent format. Custom elements are supplied by the app; a document does
not get to register arbitrary JavaScript or activate arbitrary HTML. File paths
are data, not shell fragments or unrestricted URLs.

The file-serving boundary will need to enforce the canvas root, including when
symlinks are involved. Concurrent agent and browser edits also need an explicit
conflict policy rather than silently overwriting each other. Those are design
requirements, not implemented guarantees of this scaffold.

## Two reusable techniques

These ideas should be useful independently of Canvas Lite: a low-configuration
local web-app launch URL, and an exec/stdio connection to a sandbox. Neither
requires adopting the canvas UI or its document format.

### Local launch URL and authentication

Proposed behavior, not implemented in the scaffold:

1. Listen on an available, randomly selected loopback port. Bind before printing
   the URL; a random choice alone cannot guarantee a free port.
2. Generate a random seven-hex namespace, `/canvas-lite-<randomhex7>`, and an
   independent cryptographically random bearer token (for example, 32 bytes).
   The short path is for namespacing, not the authentication secret.
3. Print a launch URL such as
   `http://localhost:<port>/canvas-lite-<randomhex7>/?token=<secret>`.
4. Validate the query token before serving the app, set a host-only `HttpOnly`
   cookie scoped to that canvas path, and redirect immediately to the same path
   without the token query. Use the trailing slash consistently for relative
   asset URLs. Include `SameSite=Strict`; use `Secure` when serving over HTTPS.
5. Keep all app routes beneath that prefix and require authentication for app
   assets, files, APIs, and event streams. The random path alone grants nothing.
6. Expire the token after seven days, enforced by the server. Cookie sessions
   must expire no later than that same deadline; exchanging the token again must
   not extend it. Rotation or stopping a non-persisted session may invalidate it
   earlier. After expiry, require a fresh launch credential.

This resembles the token-URL-to-cookie flow documented by
[Jupyter Server](https://jupyter-server.readthedocs.io/en/latest/operators/security.html).
It is a simple local-app launch technique, not a claim of equivalence to all of
JupyterHub's deployment or security features.

Path scoping avoids sending this cookie on ordinary visits to unrelated paths
when a port is later reused. It does **not** make cookies port-specific: a request
to the matching path on another port of the same hostname can carry the cookie
too. Revisiting a stale history URL can therefore send it to a replacement
server. Path scoping reduces accidental overlap, not exposure to a malicious
local service. These limitations follow from
[the cookie specification](https://www.rfc-editor.org/rfc/rfc6265.html#section-8.5).

The query token reaches the HTTP server, unlike a fragment token. Keep it out of
request logs, use `Cache-Control: no-store` and `Referrer-Policy: no-referrer` on
the bootstrap response, and serve no app content before redirecting. Removing
it from the address bar does not erase previous copies in history or logs. The
printed launch URL itself is a secret.

Validate the expected Host and Origin for requests, protect state-changing
operations against CSRF, and do not treat different localhost ports as isolated
by SameSite cookies. Loopback binding remains the default; this sketch is not a
recipe for exposing an unaudited HTTP service to the network. Authentication and
bootstrap credentials stay outside the agent's sandbox.

### Exec as the sandbox connection

The command after `--` provides the connection, not an agent HTTP address. Spawn
it with pipes and give the backend guest scoped access to that child's
stdin/stdout through host messages. This can support other browser tools talking
to an existing sandbox without giving the sandbox a network interface. The
browser authentication technique above protects the outside-facing endpoint;
the exec technique supplies the inside-facing transport. Details follow.

## Exec-backed web server direction

The backend guest can request the application's command-line
arguments from the backend host. The host supplies the argument list, not the
whole environment or the runner's Deno permission flags. Parsing the application
arguments and deciding the mode belongs in the guest; process and HTTP I/O belong
in its host.

Split the application arguments at the first `--`:

- With no arguments before `--`, the guest selects web-server mode.
- Everything after `--` is the executable and its arguments, preserved as an
  argument vector. Later `--` arguments belong to that executable.
- `agent` selects the stdin/stdout endpoint. Other options are not designed yet.
- A missing executable should produce a useful error in this mode, not silently
  choose a shell or an agent.

Conceptual invocation, omitting the Deno permission flags:

```text
backend.js -- <exec command> <arguments for entering the existing sandbox>
```

The guest requests that the host start the configured command and listen for
browser requests. The host spawns the command directly, without shell string
interpolation, with piped stdin, stdout, and stderr. Start one child for the
session, not one per HTTP request. Browser input does not choose the executable
or supply extra process arguments.

The intended communication path is:

```text
browser ↔ local HTTP server ↔ backend guest ↔ backend host
                                                ↕ child stdin/stdout
                                         exec into existing sandbox
                                                ↕
                                         agent-side endpoint
```

The host delivers HTTP requests and child output to the guest through messages.
The guest decides what to forward, and asks the host to write child input or
respond to the browser. It never receives raw Deno process or server objects.
The current implementation delivers argv and agent request bytes through guest
exports; more general request/event delivery is still to be designed.
The frontend host/guest pair remains the browser-side boundary.

### No direct sandbox network

The exec command can enter an **existing** Podman container or smolvm where the
agent is running. Canvas Lite need not create the sandbox, install an HTTP server
inside it, or connect to an agent TCP port. The agent-side endpoint might be a
small adapter to the running agent rather than a new agent instance.

The existing sandbox must actually have no network access; using exec alone does
not remove networking from it. For a VM, its supervisor must provide a suitable
exec/stdio transport. The privileged container or VM control connection stays
outside the sandbox. Neither it nor host network sockets are passed to the agent.

For testing, the server and agent-side endpoint can run in the **same instance**,
using a local child command and the same stdin/stdout interface. A second VM or
container is not required to work on the canvas. This exercises the transport and
UI, not the no-network isolation claim. The two Wasm instances per side (host and
guest) remain separate regardless of where the external command runs.

The browser-facing server lives outside that boundary. All agent communication
passes through exec's pipes, including any explicitly granted model-service
traffic if that is added later. No direct network does not mean air-gapped:
these pipes are intentional, mediated communication channels.

### Leave these choices open

- How the tiny placeholder protocol grows into file requests and canvas edits;
  it currently returns an HTML body, not an entire HTTP message over stdio.
- File framing and request IDs: pipe reads are arbitrary chunks, not message
  boundaries. Keep diagnostics on stderr, separate from protocol stdout.
- Streaming and backpressure, rather than buffering whole files or unbounded
  output. The current no-op-free allocator is not yet suitable for sustained
  traffic without a buffer-reuse strategy.
- The authentication implementation described above, allowed operations, and how
  the user approves a transfer. Command-line arguments must not be exposed to
  the browser by default.
- Cancellation, EOF, child failure, and shutdown: stopping the exec session must
  not accidentally stop the pre-existing sandbox or its independent agent.

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
