# Rust project container — work in progress

This is the resources-edge implementation track, separate from the proposed
`dev/app` design. The target is an iframe with at most 40 lines of JavaScript,
each shorter than 80 characters, and two `wasm32-unknown-unknown` Rust modules:

- A trusted sandbox validates DOM operations and tracks reference lifetimes.
- An untrusted application owns Mahjong's state and calls only the sandbox.

The JavaScript bridge must not hide application or policy code in generated
strings, other scripts, or Rust constants. The sandbox is not replaceable by
project files. A fresh output frame gets fresh instances and reference tables.
The Rust source and resources will be ordinary editable/exportable project files.

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

The next integration step is an authenticated, same-origin resources-edge
endpoint that forwards to this service. An edge deployment cannot run rustc
itself: it will need an explicitly configured isolated build service.

## Completion checks

- Run the actual Rust port in a saved resources-edge project, including edits.
- Verify both Wasm instances execute in the output iframe and no JS interpreter
  executes the game. Inspect the 40-line bridge and actual loaded resources.
- Play the 144-tile turtle through to completion; check reset, selection,
  blocked tiles, mismatches, undo, options, and narrow-pane layout.
- Exercise invalid references and commands, network/navigation attempts,
  directory traversal, compiler file disclosure, and failure recovery.
- Use browser screenshots and interactions, not compilation alone, as evidence.
