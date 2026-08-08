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

This package is early. The runner currently establishes the layered runtime
and supports the core `dom-use` event path. Browser compatibility additions
belong in the synthetic guest environment, with tests, rather than in
presentation-specific input shims.
