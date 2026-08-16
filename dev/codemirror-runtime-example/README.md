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
