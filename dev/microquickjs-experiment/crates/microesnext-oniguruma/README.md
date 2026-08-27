# microesnext-oniguruma

Optional Oniguruma regular-expression support for MicroESNext.

This crate owns its C boundary. It builds a vendored, UTF-8-only subset of
Oniguruma for `wasm32-unknown-unknown` and supplies every C-library-shaped
operation through small repository-owned ponyfills. It does not link
Emscripten, WASI libc, musl, a platform libc, or `onig_sys`.

The narrow public Rust API keeps Oniguruma types and allocation details out of
the JavaScript engine. MicroESNext can therefore omit this crate entirely or
select another regular-expression backend.

The vendored source retains its upstream license. `vendor/SOURCES.md` records
the exact upstream revision and the deliberately limited source-file set.

