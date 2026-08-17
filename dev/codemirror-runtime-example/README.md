# CodeMirror runtime example

One ordinary CodeMirror application produces a modern bundle for QuickJS-NG
and Bellard QuickJS and a Babel-lowered ES5 bundle for MicroQuickJS. The DOM
facade, wire protocol, and browser acceptance suite are shared.

`generated/` is build output. A patch belongs in source only when Babel cannot
bridge a runtime semantic; it must explain why and apply to the narrowest
target possible.

`babel-microquickjs.js` contains that narrow compatibility layer. It currently
renames catch bindings that MicroQuickJS rejects when they shadow a function
binding, without changing the application or either full-engine target.

The Babel output compiles to MicroQuickJS bytecode. Four ISC-licensed ungap
collection implementations are vendored by source file and installed only by
the MicroQuickJS entry point. A small, separate platform ponyfill contains
additional APIs discovered by executing CodeMirror, currently `Array.find`,
`Object.assign`, and `encodeURIComponent`.

The complete bundle now executes through initialization and reaches
the guest DOM implementation. MicroQuickJS work is paused after reaching
CodeMirror plugin initialization; Bellard QuickJS is the first end-to-end
Wasm milestone. Browser-realm execution is only a development baseline and
does not count as passing the runtime example.

## Current stress corpus

The build embeds real repository files rather than generated filler:

- 1,065 lines of TypeScript from `packages/dom-use/src/index.ts`;
- 648 lines of HTML from the todo example;
- 692 lines of the Resources.co stylesheet;
- 290 lines of a DOM schema in JSON; and
- 408 lines of the dom-use README in Markdown.

Each file uses its CodeMirror language module. `basicSetup` supplies line
numbers, history, search, folding, bracket matching and completion, selection
highlighting, and gutters; the example also uses One Dark, wrapping, and
runtime language reconfiguration.

The initial QuickJS-Wasm baseline on the development machine is about 177 ms
to initialize the 1,065-line TypeScript editor. Switching through all five
modes and applying 100 single-character transactions to each takes about 7.57
seconds. After collection the engine reports roughly 28,000 objects, 67,600
properties, and 6.7 MiB of managed memory. These numbers are deliberately
recorded before optimization. Guest `Date.now()` is not yet a valid clock, so
the host timestamps benchmark phases.

## Browser projection milestone

`http://codemirror-quickjs.localhost:3030/` now runs the CodeMirror bundle only
inside Bellard QuickJS compiled to WebAssembly. The browser module starts the
VM, accepts an allowlisted DOM snapshot, sanitizes generated CSS, and projects
the resulting tree into an owned page surface. CodeMirror is not imported into
the browser realm.

The initial snapshot now assigns durable guest identities and reconciles the
real browser nodes in place. Browser events return to QuickJS through a compact
binary record, and a CodeMirror-owned search button can update the guest and
remove its projected panel without detaching the editor or losing focus.

The next protocol step is to send browser `MutationObserver`, selection, and
measurement records alongside the triggering input event. That lets ordinary
contenteditable input be observed by CodeMirror without an editor command in
the host. Once that works, steady-state guest writes should become ordered
mutation batches rather than repeated full-tree snapshots. Most DOM-shaped guest objects can be
short-lived facade objects. A facade acquires a durable scalar host reference
only when its identity must cross a batch, survive reordering, or remain in an
event callback. QuickJS finalizers enqueue releases; they should not cause a
synchronous host call for every collected wrapper.

The browser visual test checks desktop and mobile bounds, line-number and fold
gutters, an actual folded range, search controls and highlights, and rejected
host errors. The test also caught two facade semantic bugs—sibling moves and
the shared value behind `Text.nodeValue`, `Text.data`, and `textContent`—that a
tree-count benchmark could not detect.
