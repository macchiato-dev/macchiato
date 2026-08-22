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

Local URL: `http://playground.localhost:3030/`
