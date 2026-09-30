# Rust project container

An unreleased resources-edge prototype, separate from the proposed `dev/app`
design. It runs an iframe with 40 lines of JavaScript, each shorter than 80
characters, and two dependency-free `no_std`, `wasm32-unknown-unknown` modules:

- A trusted sandbox validates DOM operations and tracks reference lifetimes.
- An untrusted application owns Mahjong's state and calls only the sandbox.

The JavaScript bridge does not hide application or policy code in generated
strings, other scripts, or Rust constants. `frame.js` only instantiates the
modules, copies bytes between their separate memories, forwards events, and
performs the trusted sandbox's DOM operations. The sandbox owns the reference
identities and permissions; JavaScript holds the corresponding browser objects.

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
`sandbox.call(op, reference, a, b, pointer, length)`. The bridge copies that
byte range into the trusted sandbox's bounded inbox before calling it.
An invalid operation returns `u32::MAX`.

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
tile rules, shuffled solvable deal, selection, matching, undo, optional hints,
names, elapsed time, and move counts. A deck has 136 regular tiles and eight
distinct bonus tiles; flowers match flowers and seasons match seasons.
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
