# Design requirements

- Publish one concise host module with no runtime dependencies or guest runtime.
- Mount a tar/tar.gz URL onto a `Document` or `Element` with a fixed policy.
- Download once with omitted credentials/referrer and retain the bytes in memory.
- Support only regular V7/ustar headers; reject extended records and links.
- Expose no listing and copy only one explicitly named archive entry at a time.
- Load `main.wasm`; additional modules share one bounded memory.
- Store guest-selected references `0..2**18 - 1` in one simple host array.
- Require the guest to claim, allocate, reuse, and clear its own references.
- Give child modules `parentMask & requestedMask`, never broader authority.
- Omit network-capable DOM, URL attributes, navigation, storage, and clipboard.
- Permit attached finite plain JavaScript data, but no functions or prototypes.
- Keep examples and generated runtimes in the repository and CI, not npm.
- Build examples with exact Deno read/write/network permissions.
- Put extended explanations in a separately distributable Wasm-capable book.

An optional JavaScript example may use one Wasm coordinator VM to host a second
QuickJS, MicroQuickJS, or other guest VM. It supplies that runtime itself;
`quickjs-emscripten` is not a dependency or the architecture of the host.
