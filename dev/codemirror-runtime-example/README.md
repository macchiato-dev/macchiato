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
`document is not defined`. This is the intended next boundary: browser APIs
belong in the replaceable guest DOM facade rather than the generic host.
