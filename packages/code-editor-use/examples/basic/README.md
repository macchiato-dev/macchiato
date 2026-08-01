# CodeMirror in QuickJS

This directory is a self-contained nested npm project, deliberately excluded
from the root workspace. Install and run it directly:

```bash
cd packages/code-editor-use/examples/basic
npm install
npm start
```

With no `PORT`, the operating system selects a free port and the command prints
its URL. Use `PORT=8765 npm start` to select one. This path imports reusable npm
modules and does not use SQLite or fetch an app from another subdomain.

The project now looks like an ordinary small website. `index.html` links
`style.css` and declares `/code-editor-guest.js` with a normal script element.
`macchiato.app.json` is the only special part: it names the entry, HTML and CSS
schemas, QuickJS target, trusted `client.js` bootstrap, and specialized
code-editor host adapter.

The loader removes the authored script element and never lets the browser
execute it. It validates and serves `style.css` under that same name, sanitizes
the initial HTML, then adds only the trusted runtime bootstrap. The bootstrap
starts QuickJS/WASM, installs `browser-use`, fetches the extracted script from
the guest manifest, and evaluates it inside QuickJS.

Inspect detection without starting the app:

```bash
npm run detect
```

To expose the separately registered declaration through Macchiato's optional
subdomain catalog instead:

```bash
node packages/macchiato/src/macchiato.js app install code-editor-use
node packages/app/src/index.js --host 127.0.0.1 --port 8765
```

For a temporary development mapping, add `--app-plugin code-editor-use` to the
server command. Only this optional catalog uses SQLite to remember the mapping;
the handler and standalone runner remain storage-neutral.

No separate bundle command is required for development. On its first request,
the example handler uses the root `esbuild` dependency to bundle
`packages/code-editor-use/src/guest.js` for QuickJS and `host.js` for the page,
then caches both bundles in memory.

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

Editor interaction intentionally diverges from the generic DOM facade.
`CodeMirrorInputBridge` owns CodeMirror-specific browser event semantics and
caches the rendered line objects and their rectangles for an entire pointer
event or drag. During dragging, the browser previews one native range from that
snapshot; mouseup sends one viewport-relative selection transaction to
QuickJS. Stable reads therefore return from the event cache, pointer movement
does not synchronously re-run the editor, and QuickJS remains authoritative at
the event boundary. A scoped preview class temporarily reveals the native
range that CodeMirror normally makes transparent, then yields to CodeMirror's
guest-owned selection layer on mouseup. The authoritative mouseup commit runs
in the final bubble phase, after CodeMirror has finished reconciling the native
cross-line range, so a later editor handler cannot collapse the committed
selection. The native range remains visibly enabled while the guest selection
is non-empty, covering cases where CodeMirror retains the correct state but
its remote selection layer misses a paint. Double-click selects a word;
triple-click selects the complete logical line, including its trailing newline
when present. Mod-A follows CodeMirror's standard keymap through the fake DOM;
the input bridge reconciles visible selection state after the forwarded event
completes instead of special-casing the command. The fake browser environment
is configured from the host platform before CodeMirror initializes, so its
ordinary keymap chooses Meta bindings on macOS and Control bindings elsewhere.
The host event-return boundary refreshes cached guest selection state only
after CodeMirror's handler has run.

The host bridge retains opaque handles and allowlists DOM reads, writes,
methods, event fields, tags, attributes, class families, element count, depth,
text size, and event subscription types. A guest request to listen for an
undeclared event fails closed before a native listener is installed. A
`MutationObserver` validates the live subtree and clears it after any rejected
mutation.

Migration to ordinary fake-DOM behavior is incremental. Select All and macOS
Ctrl-F now use CodeMirror's standard platform keymap. Search-panel painting
still has a temporary platform-aware compatibility handler (Meta-F on macOS,
Ctrl-F elsewhere) until CodeMirror's standard panel lifecycle is fully
represented by the fake DOM; importantly, Ctrl-F is no longer mistaken for
Find on macOS.

The guest bundle is served as data and passed to `sandbox.evalGlobal`; it is
never loaded as a page `<script>` or module. The browser test asserts that no
CodeMirror constructor is present in the page global and exercises editing,
selection, search, completion, undo/redo, focus, and fail-closed mutation.

## Execution order and dependencies

The browser bootstrap is `packages/code-editor-use/examples/basic/client.js`. The guest starts
in this order:

1. the plain `packages/browser-use/guest/quickjs-dom-environment.js` environment;
2. the host platform configuration (`navigator.platform`, user agent, vendor);
3. the bundled `packages/code-editor-use/src/guest.js` CodeMirror setup.

The environment is inspectable and runnable without a bundler. Its generated
string adapter is checked with `npm run check:generated`. CodeMirror and
`browser-use` are inputs selected by this example; the exported
`code-editor-use` policy entry has no runtime dependencies. The independent
`package.json` exposes every package and command chosen by the example.

The application owns guest setup. `code-editor-use` supplies the constrained
policy, the specialized host input bridge, and a reference CodeMirror guest;
it does not install or start CodeMirror implicitly for applications. This
example deliberately chooses the reference guest, bundles it, configures its
fake browser environment, and evaluates it in QuickJS.

The package is private and independently installable. Local `file:` dependency
paths make repository development inspectable; published consumers would use
normal package versions.
