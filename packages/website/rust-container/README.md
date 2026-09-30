# Rust project container

An unreleased resources-edge prototype, separate from the proposed `dev/app`
design. It runs an iframe with at most 40 lines of JavaScript, each shorter than 80
characters, and two dependency-free `no_std`, `wasm32-unknown-unknown` modules:

- A trusted sandbox validates DOM operations and tracks reference lifetimes.
- An untrusted application owns Mahjong's state and calls only the sandbox.

`frame.js` starts only the trusted Rust host. Its predefined primitives create
strings, numbers and byte views, get/set properties, call functions, construct
objects, and create callbacks into Rust. There is no `eval`, function-source
compilation, DOM dispatcher, or guest-specific code in this bridge.

The host receives a reference to the global object. It uses these primitives
to construct the second WebAssembly instance, build its import object, copy
its memory, and install its event handlers and clock. All DOM permissions and
operations live in `sandbox.rs`; the parent integration only supplies the
trusted host bytes and the application bytes as its input.

Host-side references are separate from the guest's numeric capabilities.
JavaScript holds arbitrary objects in an array with a free-slot stack. Rust
releases temporary references on scope exit and retains only owned state.
Dropping a callback's table entry does not remove the callback from its DOM
listener or timer; those objects hold normal JavaScript references to it.
The application receives only `sandbox.call`, never the privileged bridge.

The sandbox is not replaceable by project files. A fresh output frame gets
fresh instances and reference tables. The Rust source and two PNG sheets are
ordinary editable/exportable project files. There is no JavaScript interpreter
in this output container. The surrounding resources-edge editor is unchanged.

Local project: <http://resources-edge.localhost:3030/benatkin/rust-mahjong>.

## Build and run

Install `wasm32-unknown-unknown` with rustup and install Fedora's `bubblewrap`
and `util-linux` packages. From this directory, run `deno task serve`, then
`deno task build` in another terminal. The build uses the HTTP API below; it
does not have a separate unsandboxed compilation path. Outputs go in ignored
`dist/`, including a standalone diagnostic page and the iframe document.

The resources-edge artifact loader serves the frame and trusted sandbox from
`/-/resources-site/rust-project-frame.html` and `rust-project-sandbox.wasm`.
Restart the local app server after rebuilding these artifact-set inputs.
`node seed-project.js` creates the example for the existing `benatkin` account;
it deliberately refuses to overwrite an existing project.

The project's configuration uses `runtime: "rust"`, `entry: "mahjong.rs"`, and
`output: { iframe: true }`. Edits call the compiler API. A successful build
starts in a hidden replacement iframe and swaps in only after `start` returns.
Failed compilation leaves the previous running game intact. The working and
published builds occupy separate replaceable cache slots, so public visitors
do not have to authenticate to compile the owner's published code.

## Compilation API

`deno task serve` starts a local compiler at `127.0.0.1:8791`. It needs rustc,
the `wasm32-unknown-unknown` target, Fedora's `bubblewrap`, and `prlimit`.
It generates a private bearer key under the sibling
`macchiato-work/rust-compiler/` directory. Never send this key to the browser.

`POST /compile` accepts `entry` and `files`, whose entries have `path`, `content`,
and optional `encoding` (`utf8` or `base64`). It returns `application/wasm`, or
a JSON error. No caller-supplied commands, compiler flags, Cargo dependencies,
build scripts, or environment are accepted.

Each build has its own directory, user/mount/PID/network namespaces, a cleared
environment, read-only compiler and system libraries, and no host home or
network. Only its project directory is writable. The API fails closed if
Bubblewrap cannot establish those boundaries. Compilation has CPU, wall-time,
address-space, file-size, input-size, and diagnostic-size limits. This is not a
claim that rustc itself is invulnerable; keep the toolchain and kernel updated.

The authenticated, same-origin resources-edge endpoint is
`POST /api/rust/compile`, with the same request body. It forwards to the
loopback service without revealing the worker key. Missing authentication is
401; wrong origin is 403; invalid source or paths are 422; oversized input is
413; a concurrent build is 429. An edge deployment cannot run rustc itself:
this local adapter is not a Bunny compilation service. A deployed version
will need an explicitly configured isolated build service.

## Small ABI

The application exports its memory, `start(seed)`, and `event(token, time)`.
Token zero is a clock tick with monotonic milliseconds; other tokens are
application-chosen click callbacks. Only the application imports
`sandbox.call(op, reference, a, b, pointer, length)`. The Rust host requests a
bounds-checked view of the child's memory and copies that byte range into its
bounded inbox before interpreting the operation. Guest calls from a Wasm
start section, before the child's memory is available, are denied.
An invalid operation returns `u32::MAX`.

The privileged bridge uses a separate ABI: `string(pointer, length)`,
`bytes(pointer, length)`, `number(value)`, `value(reference)`,
`get(object, key)`, `set(object, key, value)`,
`call(function, this, argument_refs_pointer, count)`,
`new(constructor, argument_refs_pointer, count)`, `callback(token)`, and
`release(reference)`. Reference 0 is undefined and 1 is the borrowed global.
`callback` calls the host's `dispatch(token, arguments_reference)`; its
returned reference is consumed by the bridge, as is the arguments reference.
Host references cannot be guessed through the guest API: that API never
interprets an argument as a host reference.
The host's callable exports are only `start` and `dispatch`; its inbox and
policy functions are internal. Browser exceptions abort the current call;
temporary Rust handles are not unwound across a JavaScript exception, so a
failed frame should be discarded rather than reused. Normal returns release
them, including nested guest-to-host calls.

| Operation | Meaning |
| --- | --- |
| 0 | Create an allowlisted element under an owned parent; return its reference |
| 1 | Set plain text and retire references to replaced descendants |
| 2–4 | Set a semantic CSS property with a number, keyword, or RGBA color |
| 5 | Set an allowlisted accessibility attribute |
| 6–8 | Hide, remove a subtree, or associate a click token |
| 9–10 | Register bounded PNG bytes, or use that resource on an image |
| 11 | Render a list of numeric box-shadow records |
| 12 | Render a property/duration/delay/easing transition |

Reference zero grants the body. Other IDs are allocated from a fixed array
and a free-ID stack; allocation does not scan for vacant cells. Removing a
subtree retires all its references. PNG resources are distinct from elements
and cannot be used as parents. Depth, references, transferred bytes, image
dimensions, cumulative pixels, and image bytes are bounded. Animated PNGs are
rejected. No raw HTML, arbitrary CSS, URLs, navigation, or network operations
are available. The iframe has an opaque origin (`sandbox="allow-scripts"`)
and a restrictive CSP as a second boundary.

This prototype is intended for untrusted guests, but is not a security release.
In particular, a guest can still monopolize its browser thread with a loop;
these bounds do not provide execution preemption or a CPU budget.

## Mahjong and artwork

`mahjong.rs` ports the existing example's half-tile turtle coordinates, free
tile rules, selection, matching, undo, optional hints,
names, elapsed time, and move counts. A deck has 136 regular tiles and eight
distinct bonus tiles; flowers match flowers and seasons match seasons.
New Game shuffles all 144 individual tiles. There is no stored solution or
fixed pairing of board positions, and random deals need not be solvable. This
corrects the fixed removal sequence used by the earlier JavaScript example
and the initial Rust port.
Selections darken, matching tiles fade, and the win message fades in without
reporting "no moves". Settings dismiss on selection or an outside click.

Artwork is by FluffyStuff/riichi-mahjong-tiles (public domain), copied from
`examples/mahjong/tiles/`. `tiles.png` is its `ExampleRegular.png` sheet.
`bonus.png` rasterizes `Flower1.svg` through `Flower4.svg`, then `Season1.svg`
through `Season4.svg`, at 150×200 pixels each in a 1200×200 row. It was rendered
using Chromium's canvas `drawImage`, with transparent background. Its SHA-256
is `23edaf6ed029a216d440b4b13311bba1c3920e3d1bc41de638e19dc07cfb3120`.
The guest owns the sheet dimensions and cropping, next to resource loading;
the sandbox knows nothing about Mahjong or tile shapes.

## Completion checks

- Run the actual Rust port in a saved resources-edge project, including edits.
- Verify both Wasm instances execute in the output iframe and no JS interpreter
  executes the game. Inspect the 40-line bridge and actual loaded resources.
- Play the 144-tile turtle through to completion; check reset, selection,
  blocked tiles, mismatches, undo, options, and narrow-pane layout.
- Exercise invalid references and commands, network/navigation attempts,
  directory traversal, compiler file disclosure, and failure recovery.
- Use browser screenshots and interactions, not compilation alone, as evidence.

### Verified locally (2026-09-30)

- The revised bridge is 39 lines, maximum 77 characters. Browser tracing
  observed bootstrap instantiation followed by child construction called from
  Rust through `bridge.new`. The child imports only `sandbox.call`; trying
  to import `bridge.call` fails at instantiation. The host is 13,457 bytes.
- With the revised bridge, all 144 tile images decoded; browser clicks played
  30 matching pairs, checked mismatched deselection, undo and reset, with no
  page errors. Screenshots checked the project split and narrow layout.
- After ten New Games and timer callbacks, the bridge stayed at 361 allocated
  slots, 27 free (334 live). Boundary probes checked forbidden tags/properties,
  attributes, stale references, invalid image resources, transfer limits,
  signed CSS values and repeated subtree removal through the real guest ABI.
- The initial bridge's browser checks observed two instances importing
  `browser.emit` and `sandbox.call`. That DOM-specific bridge has since been
  replaced by the generic bridge above; those imports are historical only.
- Before the random-deal correction, Playwright clicked through all 72
  matching pairs in the saved project,
  observed the delayed win transition, and reset to 144 tiles. There were no
  output-frame network requests or page errors. All 144 images decoded.
  That fixed-sequence run is historical evidence, not a test of random deals.
- After replacing that sequence with a full-deck shuffle, 20 New Games had
  20 distinct arrangements with four copies of every regular type, four
  flowers, and four seasons. Browser-driven legal play removed 53 pairs from
  one random deal before it ran out of moves; undo restored the last pair and
  New Game restored 144 tiles. No page errors occurred.
- Blocked tiles, mismatched deselection, hint, undo, singular move/undo labels,
  settings, and outside-click dismissal were exercised. Screenshots checked
  the project split, settings menu, 700-pixel project view, and a 360-pixel
  output with optional controls enabled; there was no horizontal overflow.
- Editing invalid Rust through CodeMirror returned 422 without replacing the
  running frame. Correcting it returned 200 and replaced that frame. A public
  visitor continued using the published artifact while a newer draft existed.
  Test-only draft edits were removed afterward.
- Direct sandbox probes rejected unsupported tags, properties, attributes,
  units, stale references, wrong resource types, malformed PNGs, and animated
  PNGs. Replacing parent text retired child references and preserved literal
  markup as text, not HTML.
- API probes rejected host-home/system-file reads, parent-directory reads,
  traversal filenames, and file/directory collisions. A subsequent valid
  module returned 42. No temporary compilation directories remained.
- Existing content-store, SQL-policy, and application-machine checks passed:
  `node --test packages/app/test/resources-content.test.js
  packages/website/test/content-sql-policy.test.js
  packages/website/test/resources-application-machine.test.js` (10 checks).

These are prototype acceptance checks, not a completed security audit.
