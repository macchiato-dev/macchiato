# MicroESNext

Design notes include the [ponyfill source survey](docs/ponyfill-sources.md) and
the implementation-independent [testing strategy](docs/testing.md).

MicroESNext is a new, single-crate experiment in progressively rewriting
MicroQuickJS in Rust. It starts from a compact C baseline rather than from the
earlier Rust-native object and memory model.

The baseline was copied without modification from a fresh checkout of
[`bellard/mquickjs`](https://github.com/bellard/mquickjs) at
`203d5bb79789bc47b74855d9207415dab71661a0`.

## Layout

- `src/` is the Rust crate. Rust replacements will enter here a bounded piece
  at a time.
- `c/` is the retained MicroQuickJS implementation. Its `generator/` subdirectory
  contains only the source generator needed to create the atom header.
- `docs/` contains source maps and design notes.

There is deliberately no `crates/` directory. A capability may become a Rust
module or Cargo feature, but it does not become a separate crate merely to
create an architectural boundary.

The C baseline includes the engine, bytecode definitions, UTF-8 and numeric
support, and soft-float templates. The build-only C helper generates the atom
header and is never linked into the library. The baseline excludes the `mqjs`
command-line shell, readline and terminal code, examples, executable test
programs, and the previous experiment's local `microesnext.c` companion.

`build.rs` uses the `cc` crate for both host and target C compilation. It builds
and runs the upstream ROM helper only long enough to generate
`mquickjs_atom.h`, then compiles the engine as a static library. It does not
compile the shell-owned default environment, whose generated table refers to
shell services such as printing, clocks, timers, and file loading. The crate
does not define or ship an executable.

The imported C sources retain their upstream copyright and license notices.
See [LICENSE](LICENSE).
