# Presentation container

The presentation container treats a portable project archive as a virtual file tree. A browser downloads the archive once, verifies its 50 MB transport budget, and expands it in memory. Text files can be opened in the constrained editor when they fit that editor's own document budget. Images are rendered by a separate host-owned image viewer, and large single-file HTML exports remain downloadable without being pushed through CodeMirror.

The archive is ZIP with a `macchiato.project.json` manifest. Exports use uncompressed entries for a small, auditable implementation; imports accept stored and deflated entries. Paths are relative, traversal is rejected, and the archive is limited to 256 project files. Binary images use a base64 representation in the versioned snapshot, so the internal JSON ceiling is higher than the 50 MB archive ceiling.

## Views and lifecycle

A project has three related views:

- The editor view combines source, preview, versions, and details.
- `/<namespace>/<project>/embed` contains only the rendered project and a presentation action.
- Present promotes the preview into a body-level portal that fills the viewport. Its X and Escape both return the exact same preview subtree to its workspace position.

The portal is host-owned. Closing it must remove or return every node it introduced; guest code cannot leave an invisible overlay behind. A presentation surface should default to at most 1,000 live elements. A typical deck should use only a few hundred, with independent sub-budgets around 100 elements for the chapter browser, history, and reading-progress panels. Rendering a new slide replaces the old slide subtree instead of accumulating it.

## Runtime boundary

The exported dom-use tour is currently a self-contained, browser-native HTML baseline. Its notes and reading state use `sessionStorage`, with an in-memory fallback for opaque sandbox origins. Resources.co serves that export on the separate blog-example origin, where it runs under an iframe CSP that permits its bundled inline script.

Imported single-file scripts are intentionally not enabled by weakening the main Resources.co CSP. The next runtime milestone is to execute the presentation program in its own QuickJS WebAssembly VM and forward only the configured presentation surface through `dom-use`. That bridge needs explicit support for:

- one primary slide container plus bounded, temporary portal containers;
- visibility and focus signals used for reading-time accounting;
- session-scoped key/value storage rather than a browser global;
- file-list and download capabilities over the verified virtual archive;
- event subscriptions, timers, gas refill, and teardown;
- a node ledger that enforces both the total and per-panel budgets.

QuickJS is the practical first engine because the repository already has a browser-tested WASM host and guest bridge. SpiderMonkey remains an interesting later engine option, particularly when compatibility or performance warrants a larger runtime, but its official embedding path is presently centered on native C++/Rust applications rather than a small, widely used browser-WASM distribution. See [SpiderMonkey's embedding documentation](https://spidermonkey.dev/) and [quickjs-emscripten](https://github.com/justjake/quickjs-emscripten).

The runtime name is part of the container configuration, not the project archive format. A future `engine: "spidermonkey"` or audited native production mode should consume the same project and capability declarations.

## Exported tour

From the external tour repository:

```sh
npm run export:offline
```

This produces one `dist/offline/index.html` containing its CSS, generated source data, program, and optimized JPEG artwork. The current result is about 3 MB. Because the artwork is already compressed, the exporter preserves it; a future Deno-compatible optimizer can use a WebAssembly image codec when source assets exceed configured byte or dimension budgets.
