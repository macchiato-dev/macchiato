# `@macchiato-dev/virtual-dom-use`

`virtual-dom-use` keeps the same canonical virtual DOM object inside a QuickJS
WebAssembly guest and in the browser host. The guest owns application logic;
the host owns the real DOM. After one initial snapshot, only bounded atomic
patch batches cross the boundary.

This package is an experiment toward an editor surface with a simple hot path.
It deliberately has no UI-framework dependency.

## Synchronization invariant

Both bundles import `src/model.js`, so object construction, batch application,
stable serialization, and digest calculation have one implementation. Every
batch contains the shared protocol identifier, its required base and resulting
revisions, and up to 64 path-addressed operations.

The guest applies a complete batch before returning it. The host applies the
same batch to its copy, validates the surface, and compares its deterministic
digest with the guest digest. A stale revision, invalid path, undeclared field,
shape violation, or digest mismatch fails explicitly instead of allowing the
copies to drift.

Application-only state does not need to be mirrored. The example's undo history
remains in the guest; the virtual DOM contains only render state that must be
identical on both sides.

The canonical structure is not itself a DOM implementation. It deliberately
has no `querySelector`, `appendChild`, event listeners, layout methods, or
object-per-browser-node requirement. Its current JSON-friendly flat node table
is an inspectable prototype; the same logical store could be encoded as typed
arrays, string tables, or another in-memory binary layout.

## Disposable guest DOM façade

CodeMirror still expects part of the browser DOM API. `src/guest-dom.js`
therefore provides short-lived pseudo-DOM objects whose only durable identity is
a node handle. Getters read the canonical guest store. Setters add operations to
the active batch. A wrapper never contains a browser node and never crosses the
boundary.

Wrappers may be allocated for an event or render turn and then garbage
collected. `release()` permits earlier invalidation, while finishing or
cancelling a batch advances a generation so retained wrappers can be recognized
as stale. A future optimized implementation can pool wrappers, use proxies for
broader property compatibility, or let guest build tooling rewrite common DOM
accesses directly into handle operations.

The façade is intentionally tiny today. CodeMirror support should grow from
observed requirements—selection, ranges, measurements, event registration and
bounded portals—rather than exposing a general browser object preemptively.

## Bulk updates

One input action updates content, selection, metrics, undo/redo availability,
status, and revision as one batch. The real DOM is synchronized only after the
entire virtual batch succeeds. Native input is coalesced at an animation-frame
boundary so a paste, autofill, or IME commit produces one guest transition even
when the browser exposes several intermediate input and selection events.

The initial experiment uses `set` over declared fields and `spliceText` for an
editor change. The host derives a common-prefix/common-suffix splice from native
input, so ordinary typing does not retransmit the document. Future operations
can add child-list edits without changing the revision and digest contract. Hot
reducers construct patches directly; diffing whole trees is unnecessary.

## Component event boundary

The host listens at the root of the granted component. It turns descendant
browser events into semantic actions and sends them to the guest root. A larger
application can place the boundary at an intermediate component instead. Leaf
nodes do not establish independent bridge protocols.

```text
browser event → nearest host component boundary → semantic action
semantic reducer → atomic virtual DOM batch
same applyBatch() in guest and host → digest equality → real DOM sync
```

## Compared with the full project editor

This prototype is already narrower in several useful ways:

- no UI framework in either runtime;
- no browser event, proxy, VNode, or framework scheduler crosses the bridge;
- one message carries all consequences of an action;
- native textarea behavior preserves selection, composition, and scrolling;
- exact host/guest equivalence is checked after every accepted transition;
- the guest uses 48 MiB rather than the larger CodeMirror-oriented surface.

It is not yet a better editing product: CodeMirror still provides syntax
highlighting, search, extensions, viewport virtualization, and richer commands.
The experiment is better at synchronization simplicity and native input
responsiveness. The next comparison is a virtualized line surface and selection
model that retains this exact-object invariant.

This protocol remains experimental and is not yet a security boundary for
untrusted code.

## Run

```bash
node packages/macchiato/src/macchiato.js app install virtual-dom-editor
node --test packages/app/test/virtual-dom-editor.browser.test.js
```
