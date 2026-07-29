# Constrained CodeMirror example

Run the development app plugin and open:

`http://code-editor-use.localhost:8765`

The page runs CodeMirror 6 natively because editing depends on browser
selection, focus, composition, geometry, and incremental DOM. The app
controller runs in QuickJS/WASM. It sees the editor through `browser-use`:
opaque scoped handles and JSON-only query/read/write operations.

`code-editor-use` is the specialized capability. It fixes the CodeMirror
extensions and validates the live subtree against a declared shape at startup
and after mutations. A mismatch destroys and clears the editor. The example
bundles only the audited adapter and its pinned workspace dependencies; it
doesn't accept packages, extensions, HTML, CSS, or JavaScript from the user.
