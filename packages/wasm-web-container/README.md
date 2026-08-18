# wasm-web-container

`wasm-web-container` runs a bounded WebAssembly application with selected web
capabilities. The container owns module validation, instantiation, memory
limits, the message ABI, host references, and guest lifecycle. DOM access is a
capability within the container rather than the package's whole identity.

The package is reserved for a later composition layer. Current examples
integrate the lower-level `WasmWebMachine` directly and keep their loading,
services, and policy in readable inline JavaScript.

## Virtual paths and links

Document-mode guests use canonical virtual paths with a leading slash. The
browser carries `/wal.html` as `#/wal.html`, but the guest only sees
`/wal.html`. `/` is the root. A boundary validator rejects backslashes, query
strings, traversal segments, repeated slashes, and paths without the leading
slash.

Internal navigation uses real, fragment-only anchors. Ordinary `#section-id`
links retain native in-page navigation; virtual pages use `#/page.html`. It
therefore stays within the already-loaded container and works with browser back
and forward navigation.
Navigation is default-deny. `allowNavigate: "fragment"` permits canonical
virtual fragments, `"self"` permits same-origin URLs, and a synchronous
predicate function can express another policy. An application may keep an
external address in inert data and present it in a copy-and-paste dialog.

Routing and scoped storage belong to the runner's browser services rather than
the DOM capability host. An optional general-value runner helper can use already-materialized plain
objects, arrays, strings, booleans, null, signed safe integers, and
`Uint8Array`. Runtime and runner adapters encode those values into the compact
WIT-like `msg`/`onmsg` byte exchange; they never stringify or parse JSON. The
minimal container need not require this recursive codec.
Fixed-schema messages can continue using the bounded reader and writer
directly.

## SQLite documentation reader

The SQLite reader is a curated static example and a likely GitHub Pages
candidate. Build it from this package:

```sh
cd packages/wasm-web-container
npm run build:sqlite-book
```

The build downloads the official SQLite documentation archive, verifies its
pinned SHA3-256 digest, extracts selected chapters, compiles the reader for
MicroQuickJS, and stamps the guest data into one Wasm file. `unzip`, the local
Rust/Wasm toolchain, and the prototype MicroQuickJS build are currently needed.
The input archive, intermediate source, and generated Wasm are ignored by Git.
`examples/sqlite-book/reproducibility.json` records both the input digest and
the expected output digest.

The reader has no redundant plain-page build. Its source counterpart is the
official page identified in the copy-and-paste dialog. Plain twins remain
useful for ES5-style guest applications when we want to compare the same
application running directly and through MicroQuickJS.

Public example selection will be distinct from test-data selection. A small
curated manifest can feed GitHub Pages, while large imported or generated
corpora—potentially hundreds of projects—remain local fixtures and stress-test
inputs.

## Reconstruction rules

CodeMirror, ProseMirror, Wordgard, and Xterm.js form the initial demanding
surface corpus. CodeMirror is first. Their high-frequency paths should use
measured fixed-schema messages rather than forcing all traffic through an
optional recursive value codec.
The core should provide simple bounded operation batches. Host-assisted
diffing, patching, and retained mirrors can remain a separate module when a
measured surface benefits from them.
Raw Wasm call count is not itself a reason for complexity; measure conversion,
bookkeeping, guest execution, and browser work around those calls.

- Keep ordinary commits at or below 256 changed lines. This is a ceiling, not
  a target.
- Vendored runtime sources may exceed that ceiling when copied unchanged.
- Keep each commit atomic and leave the branch runnable whenever practical.
- Use Podman-compatible Dockerfiles that also work with Docker.
- Build QuickJS-family Wasm artifacts through package command-line tools.
- Keep generated artifacts out of npm packages and Git unless a distribution
  decision explicitly requires them.

## Layers to bring home

1. Validate the Wasm header, imports, custom stamp, and bounded memory.
2. Instantiate the module and connect the two-function message ABI.
3. Move reference bookkeeping and byte encoding into this package.
4. Move the fixed DOM, CSS, storage, font, timer, and event policies.
5. Move reproducible guest-runtime building and stamping into package commands.
6. Rebuild Cat Memory, Mahjong, and additional real-world guest examples.

The working examples remain available during reconstruction at the
`wasm-web-container` declarative subdomain.
