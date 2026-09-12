# Guest node-cache lifetimes

The CodeMirror DOM facade preserves wrapper identity by host reference number.
That index must not own the wrappers: a detached node remains usable while guest
code retains it, but an unreachable wrapper must let its native finalizer return
the host-reference lease.

## Reproduction

`packages/project-editor/test/node-cache-lifetime.browser.test.js` uses the real
MicroQuickJS Wasm runtime and observes host-reference leases. Five rounds of
creating and removing 100 elements leave the real DOM empty, but initially retain
200 more leases per round, even after explicit guest collection. The cause is
the JavaScript `WeakRef` fallback, which stores its target strongly.

The replacement should use collector-aware weak storage, preserve live wrapper
identity and guest properties, and survive collection and reference reuse. It
must not advertise a complete ECMAScript WeakRef implementation merely to supply
the facade's private identity cache.

## Separate observer discrepancy

`packages/project-editor/test/intersection-observer.browser.test.js` records a
second, independent mismatch: the guest's current IntersectionObserver always
reports visibility, including for an offscreen target. The native Chromium
control checks clipping, thresholds, unobserve, disconnect and re-observe. A
separate native probe records Chromium clearing queued records on disconnect.
The Wasm parity cases remain executing TODO tests until native forwarding is
implemented; passing controls do not imply guest parity.
