# Development projects

`dev/` is the workspace incubation area for substantial experiments and new
components that will probably move into their own repositories. Keeping them
here initially makes cross-project changes and integration tests practical;
their location does not imply that they will become packages in the macchiato
repository.

Current projects include:

- `wasm-web-container/` — the nested repository for the container ABI and its
  canonical MicroQuickJS examples.
- `quickjs-guest-runtime/` — the Bellard QuickJS WebAssembly runtime port.
- `quickjs-ng-guest-runtime/` — the independent QuickJS-NG runtime port.
- `codemirror-runtime-example/` — the shared CodeMirror application and
  Babel/MicroQuickJS compatibility work.
