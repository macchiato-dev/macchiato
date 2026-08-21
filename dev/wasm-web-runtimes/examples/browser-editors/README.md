# Browser editors in QuickJS

These examples execute ProseMirror, Wordgard, and xterm.js directly inside
QuickJS compiled to WebAssembly. `WasmWebMachine` projects their browser-facing
operations into an owned document. They do not import the older
`prose-editor-use`, `wordgard-editor-use`, or `terminal-use` adapters.

Build all three guests with:

```sh
node dev/wasm-web-runtimes/examples/browser-editors/build.js
```

The declarative development app exposes each guest on its own subdomain:

- `http://prosemirror-quickjs.localhost:3030/`
- `http://wordgard-quickjs.localhost:3030/`
- `http://xterm-quickjs.localhost:3030/`

The ProseMirror and Wordgard pages exercise native contenteditable mutation,
formatting, and editor history. The xterm.js page contains a playable Pong game
whose keyboard input, timers, ANSI rendering, and 256-color stylesheet all
cross the same machine boundary.

With the development server running on port 3030, run the interaction tests
with:

```sh
node --test dev/wasm-web-runtimes/examples/browser-editors/browser.test.js
```

The host serves only the machine, the selected Wasm guest, and the small page
shell. Editor packages are bundled into the guest at build time; the browser
does not load code from another example app or invoke an editor-specific host
adapter.
