# wasm-web-container

`wasm-web-container` runs a bounded WebAssembly application with selected web
capabilities. The container owns module validation, instantiation, memory
limits, the message ABI, host references, and guest lifecycle. DOM access is a
capability within the container rather than the package's whole identity.

The package is being reconstructed from the working `dev/dom-use-lite`
experiment in small, reviewable commits. During that reconstruction,
`mountWebContainer()` delegates to the experiment's tested runner. That import
is temporary and must be gone before publishing.

## Current API

```js
import mountWebContainer from "wasm-web-container";

const container = await mountWebContainer("./main.wasm", document, {
  onDataHref(value, event, element) {
    // The attribute is inert unless the embedding application handles it.
  }
});
```

The integrated operation is intentional: callers provide a module source and
mount target, while the container establishes and owns the Wasm boundary.

## Reconstruction rules

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
