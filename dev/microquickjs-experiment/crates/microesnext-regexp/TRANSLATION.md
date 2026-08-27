# Translation workflow

The maintained implementation is a direct Rust port, not generated Rust checked
in without review. Mechanical drafts are useful for coverage and control-flow
comparison, so the workflow keeps them reproducible and separate from `src/`.

1. Run `tools/extract-reference.js` against the pinned `mquickjs.c`.
2. Translate the resulting compiler and executor units independently.
3. Use generated Rust only as a checklist and control-flow draft.
4. Replace C pointers, macros, allocation, and VM stack coupling with explicit
   Rust slices and caller-provided storage.
5. Differentially test patterns, bytecode, captures, errors, and timeouts
   against the pinned MicroQuickJS reference.

A whole-file C2Rust experiment was rejected: it imported unrelated VM code and
Clang 21's exporter could not represent parts of the translation unit. Isolating
the two regexp regions gives the translator smaller inputs and makes accidental
dependencies visible. Generated drafts belong in a sibling work directory, not
in this repository.

Oniguruma is intentionally out of scope until the MicroESNext runtime goal is
complete. Its separate crate remains a future optional backend and must not be
used to fill gaps in this port.

