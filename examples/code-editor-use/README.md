# CodeMirror in QuickJS

Run the `code-editor-use` app plugin and open:

`http://code-editor-use.localhost:8765`

CodeMirror 6, its editor state, extensions, commands, and view run inside
QuickJS/WASM. The page realm does not import or evaluate CodeMirror. Its small
bootstrap does three things:

1. starts QuickJS and evaluates the fixed CodeMirror guest bundle;
2. applies synchronous, JSON-only DOM operations to the granted editor root;
3. forwards browser events to QuickJS and honors `preventDefault`.

`beforeinput` is converted to a QuickJS CodeMirror transaction, so the native
`contenteditable` DOM never becomes the editor's source of truth. Search,
completion, history commands, rendering, and syntax highlighting are initiated
inside the guest.

Selection follows the same single-owner rule. The bridge reduces a pointer
location to a document offset and sends only that offset to QuickJS; drag
updates are coalesced to animation frames. Navigation keys are handled once in
QuickJS and stop before CodeMirror's lower-level forwarded listener, avoiding
two handlers independently advancing the same selection. Geometry stays in the
browser, while selection state stays in the guest.
Points outside a short line clamp to that line's start or end, so cross-line
dragging remains defined. Double-click expands the reported point to a word,
and vertical movement at the first or last line clamps to the document edge.
Because CodeMirror virtualizes long documents, pointer messages carry a
rendered-line index and an offset within that line—not a browser-calculated
absolute offset. QuickJS resolves that pair against `EditorView.viewport` and
retains the authoritative anchor for Shift-click and Shift+arrow selection.

The host bridge retains opaque handles and allowlists DOM reads, writes,
methods, event fields, tags, attributes, class families, element count, depth,
and text size. A `MutationObserver` validates the live subtree and clears it
after any rejected mutation.

The guest bundle is served as data and passed to `sandbox.evalGlobal`; it is
never loaded as a page `<script>` or module. The browser test asserts that no
CodeMirror constructor is present in the page global and exercises editing,
selection, search, completion, undo/redo, focus, and fail-closed mutation.
