# JavaScript tooling in Macchiato machines

Pi and Vite are target guest workloads for the QuickJS and MicroQuickJS
runtimes. They exercise complementary parts of the architecture: Pi exercises
long-lived agent state, model streams, tools, and session files; Vite exercises
module resolution, transforms, plugin hooks, dependency graphs, build output,
and file watching.

Neither receives ambient Node.js. A runtime-provided Node-compatible facade
implements only the modules and globals proven necessary by the selected
workload. It is guest code over explicit devices, not a browser `window`,
unrestricted `fetch`, or the host filesystem. Missing imports fail with the
requested module and export instead of returning behavior-changing stubs.

The facade is discovered bottom-up. Start a real bounded fixture, observe the
first missing operation, implement the smallest faithful primitive, and run it
again. Do not anticipate an entire Node subsystem because one package imported
its entry point. Every admitted module, export, global, and device operation is
recorded in a generated compatibility manifest and covered by a fixture.

## Pi

[Pi](https://pi.dev/) provides SDK and RPC integrations as well as its terminal
coding agent. Start with its agent core and an SDK-shaped integration. The full
coding-agent package currently targets Node 22.19 or newer and includes CLI,
process, filesystem, terminal, package-loading, and provider dependencies;
those are admitted incrementally through real examples rather than hidden
behind a broad compatibility object.

Pi's likely devices and facade areas are:

- process metadata, timers, events, buffers, and selected streams;
- POSIX-style path operations implemented entirely in the guest;
- a project-scoped virtual filesystem for sessions, instructions, skills, and
  edited files;
- terminal input/output connected to a separately owned terminal context;
- explicitly granted entropy, clock, and locale devices; and
- module resolution over build-stamped resources, with no ambient npm or disk
  lookup at runtime.

Model network authority stays outside the Node facade. A direct browser
transport is possible only when the provider supports the browser origin and a
credential is intentionally held in that user's browser session. The
controller still constrains origins, methods, headers, redirects, response
sizes, and frequency.

A same-origin proxy is the normal path for server-funded credentials, shared
accounts, or providers without a suitable browser API. It owns provider
credentials, quotas, and audit policy. Pi receives only a typed model transport
over `msg`/`onmsg`; it cannot read the key or repurpose the proxy as general
network access.

## Vite

[Vite's JavaScript API](https://vite.dev/guide/api-javascript.html) exposes
programmatic transforms and builds as well as its Node HTTP development server.
The first machine milestone is not a fake listening socket. It is a bounded
build and transform service over a virtual project filesystem:

- resolve and load modules from the granted project and stamped dependencies;
- run an explicitly selected plugin pipeline;
- transform HTML, CSS, JavaScript, and TypeScript;
- maintain a dependency graph and emit invalidations from virtual-file events;
- return build artifacts or transformed module bytes through the machine
  protocol; and
- optionally drive HMR through the controller without granting a WebSocket or
  network device to arbitrary plugins.

Native helpers such as Rolldown or Oxc may run as sibling Wasm machines or
devices rather than being reimplemented inside QuickJS. Their input is an
immutable snapshot or bounded stream and their output returns to the Vite
context. A plugin gets no more filesystem, process, environment, or network
authority than the Vite context explicitly delegates to it.

## Context topology

An agent session, Vite build/watch service, editor tab, and terminal tab can
each own a JavaScript context within one engine machine. That amortizes runtime
code and linear memory while keeping globals and disposable application state
separate. Dedicated machines remain available when a workload needs stronger
memory, runtime, or failure isolation.

Builds normally use a short-lived context or machine. Watch mode may retain a
Vite context until the user stops watching. The controller measures and
reclaims both; build output never depends on a still-live editor or agent heap.

## Reproducibility and verification

Run identical fixtures natively and in the machine. Normalize the project root,
clock, locale, environment, dependency versions, filesystem order, and random
inputs. For each emitted file record its path, byte length, media type, and
SHA-256. The primary parity gate is an identical sorted manifest and identical
SHA-256 for every output byte sequence.

When a mismatch occurs, preserve both artifact sets and diff bytes before
expanding the facade. Source maps, generated identifiers, line endings, plugin
ordering, timestamps, and absolute paths are inputs to make deterministic, not
reasons to weaken the test to “both builds succeeded.” Pi fixtures similarly
compare the canonical session/event stream after replacing deliberately
variable request IDs and timing measurements with injected deterministic
values.

Security tests attempt filesystem traversal, arbitrary network access,
navigation, environment and credential discovery, dynamic package loading, and
plugin or tool escalation. Performance tests record cold and warm build time,
incremental rebuild time, peak and settled memory, boundary calls, and bytes
crossing each device.

