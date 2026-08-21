# wwm-js-runtimes

`wwm-js-runtimes` provides selectable execution engines for
`wasm-web-container`:

- MicroQuickJS for small bytecode applications;
- QuickJS and QuickJS-NG for intricate existing JavaScript;
- Porffor for ahead-of-time JavaScript compilation;
- AssemblyScript for ahead-of-time TypeScript-like applications.

The package keeps runtime selection separate from the machine and container.
Each implementation may expose JavaScript-source loading, resource-bundle
loading, or both. It owns runtime-specific compilation, bytecode, contexts,
and lifecycle behavior while the container owns fetching and validates the
application input.

The existing development runtime trees will move here incrementally. Their
source history and runnable examples should remain useful during the move;
this directory is not a second implementation or a wrapper around `dev/`.
