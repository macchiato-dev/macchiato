# microesnext-regexp

A direct Rust translation of the compact regular-expression compiler and
interpreter embedded in MicroQuickJS.

The port preserves the source engine's bytecode model and ECMAScript behavior
instead of translating patterns into another regular-expression dialect. It is
`no_std`, uses only explicit caller-provided storage, and has no libc boundary.
The compiler and executor are separate features so a bytecode-only runtime does
not have to carry the parser.

During the port, differential tests compile and execute the same patterns with
the vendored C reference and this Rust implementation. The C reference is test
and provenance material; it is not linked into MicroESNext artifacts.

See [PROVENANCE.md](PROVENANCE.md) for the exact upstream source and license.

