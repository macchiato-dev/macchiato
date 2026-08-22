# @macchiato-dev/playground

This declarative application is the temporary integration point for the
machine examples. Macchiato supervises a Deno child with explicit network and
environment permissions, proxies the app subdomain to it, and records the
child's stdout and stderr in a dedicated `machine-controller-logs.sqlite`
database under the selected Macchiato data directory.

The Deno controller exposes each example beneath one subdomain. Existing
examples are initially proxied while their builds and controller/device setup
are consolidated behind this integration point.

The package will own the standalone runner, temporary single-file project
editor, and the example route index while consuming the reusable machine,
runtime, controller, bridge, and device packages.

The deployable runner should remain one medium-sized, readable JavaScript file
that starts one `.bin` or `.wasm` artifact. Its build may inline or vendor the
exact implementations of controller, bridge, and device modules that are also
published independently on npm. Those packages remain the canonical sources:
the runner build does not fork, patch, or maintain parallel implementations.
It records module versions and source hashes so the convenient single-file
artifact remains reproducible and straightforward to audit.

The temporary editor supports one HTML file with inline CSS and JavaScript. It
does not save projects to a server or durable browser storage. Its current
source, selection of example, and editor UI state are stored in namespaced
`sessionStorage` so a reload or aggressive browser update can recover the tab.
Closing that tab ends the workspace. Export is the explicit durable action.
The runner does not inherit the editor's session-storage namespace.

There is no second history system. The session record serializes the current
CodeMirror `EditorState`, including its undo/redo field, selection, and source.
It does not create versions, checkpoints, drafts, or timestamps. Restoring the
tab reconstructs that state so normal CodeMirror undo and redo continue from
where the tab left off.

The initial playground envelope is deliberately small:

- one `index.html` containing at most 500 lines;
- at most 80,000 Unicode code points (`500 × 80 × 2`);
- at most 256 code points per line while typing, with longer typed lines
  hard-wrapped;
- at most 200 serialized undo events and 50 redo events; and
- at most 2 MiB for the complete `sessionStorage` record.

All bundled playground examples obey the same source limit. When history would
exceed its event or byte budget, the guest drops the oldest undo events before
serializing while preserving current source and selection. It never truncates
the current source to make a session record fit. Input beyond the source
envelope is rejected at the editor boundary with a visible explanation.

The source envelope is enforced at the CodeMirror state boundary. A transaction
filter inserts hard line breaks while ordinary typing would make a line longer
than 256 code points. Paste and drop remain atomic: either is refused in full
when it contains an overlong line or would make the document exceed 500 lines
or 80,000 code points. The shared editor status rail explains the refusal.
Other transactions are likewise rejected if they exceed the document limits.
CodeMirror also enables visual word wrapping, matching the project editor. The
playground never minifies the source.

The single-file compiler has one shared implementation. The normal editor
posts source to the supervised Deno controller, whose bundled build performs
the inert HTML parse and constrained HTML compilation. Adding
`?compile=client` runs that same compiler in the browser for parity testing.
Both paths return only a data tree, stylesheet input, and guest scripts for the
output machine. External scripts, active HTML elements, and non-fragment links
are rejected before execution. CSS has no second schema here: the DOM display
device accepts and renders exactly the language implemented by the machine.
Matching pre-rendered nodes are adopted through their containing DOM root and
are not replaced before guest scripts hydrate them.

The display device may receive focused CSS and SVG renderer packages rather
than implementing those languages itself. It owns installation and the granted
DOM surface; the renderers own parsing, semantic representation, and
serialization. A server-side display machine uses the same packages for
pre-rendering, and the browser display device enforces the result again before
hydration. Project application code cannot substitute a trusted renderer. The
one-file runner build vendors these exact package sources into its readable
JavaScript artifact; it does not fetch renderer modules at runtime.

Local URL: `http://playground.localhost:3030/`
