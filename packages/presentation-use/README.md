# presentation-use

`presentation-use` is a generic project container for interactive slide decks
and other presentation-shaped documents. It deliberately layers isolation:

1. an iframe without `allow-same-origin` separates the presentation from its
   host page;
2. a dedicated QuickJS WebAssembly VM executes project JavaScript;
3. `dom-use` and `style-use` enforce the container's declared DOM and CSS
   capabilities inside that iframe.

The iframe is an additional boundary, not the JavaScript runtime. Project
scripts never execute as native browser JavaScript. The parent controller and
iframe runner communicate through a versioned `postMessage` protocol; the
runner renders only the tree serialized by its `dom-use` capability.

Each project supplies HTML, CSS, scripts, and explicit DOM/CSS schemas. A
container may be broad enough for dialogs, source readers, notes, responsive
layouts, and presentation overlays while still denying undeclared network
sinks. Session storage, timers, downloads, and visibility are separate grants.

For low-request startup, a project may bind one of its ordinary files as its
`containerEntry`; the controller passes that file as `project.file`. It may contain a complete HTML payload
with its styles, executable code, data, and data-URL assets embedded. The
container extracts and validates its stylesheet, boots its markup through
`dom-use`, and runs its scripts in the same QuickJS VM. The DOM/CSS policy stays
outside the payload so loading one file does not make that file its own guard.

The controller may instead receive `fileUrl`. It performs one credential-free,
no-referrer host fetch and passes the resulting bytes across the iframe
boundary. This is transport for the selected entry, not a guest `fetch`
capability. A future guest-facing project-file/`http-use` facade must remain an
explicit, separately filtered grant.

The first demanding fixture is the exported `dom-use` code tour. Its project,
embed, and fullscreen views are intended to use the same runner; fullscreen is
only a host layout change around the existing iframe and VM.

The controller's `focus()` method focuses the opaque iframe and asks the runner
to focus its presentation root. Pointer interaction restores that focus after
the complete click and any guest-driven render, unless a real control retained
focus. Document-level keyboard listeners remain guest listeners: the bridge
routes them through the synthetic document root, including when an explicit
application root is nested beneath it. The runner reports blocked operations
and Escape outward so an embedding host can render persistent status and close
its own fullscreen shell without taking arrow-key handling away from the guest.

`data-host-node-count` on the runner root is a low-cost diagnostic of the live
host-owned DOM allocation. Replaced subtrees release every tracked node,
including nodes parsed on the host that never needed an individual bridge ID.
Container limits should cover the measured steady state plus replacement
headroom; sustained growth across equivalent slides is a lifecycle defect, not
a reason to keep raising `maxNodes`.

This package is early. The runner currently establishes the layered runtime
and supports the core `dom-use` event path. Browser compatibility additions
belong in the synthetic guest environment, with tests, rather than in
presentation-specific input shims.
