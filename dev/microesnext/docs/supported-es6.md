# Supported ES6 subset

MicroESNext currently implements five newer primitives in native C. This is a
focused compatibility surface, not a general claim of ES6 conformance.

## Collections

`Map` and `Set` provide constructors from arrays, ordered storage,
SameValueZero key comparison, `size`, `get`, `set`, `add`, `has`, `delete`,
`clear`, `forEach`, and stateful `keys`, `values`, and `entries` iterators.
Iterators remain live while entries are deleted or appended.

`WeakMap` and `WeakSet` provide constructors from arrays and their usual
`get`, `set`, `add`, `has`, and `delete` operations. Keys must be objects. The
collector treats their entries as ephemerons: a live key retains its value,
while a collection alone does not retain its keys.

## Promise

`Promise` provides the constructor, `then`, `catch`, `finally`, `resolve`,
`reject`, `all`, and `race`. Reactions run through a native FIFO job queue after
the current JavaScript turn. Resolution adopts native promises and ordinary
thenables, protects against self-resolution, and ignores repeated settlement.

For this milestone, `all` and `race` accept arrays. General iterables depend on
future symbol and iterable support. Subclass constructors, species, and
unhandled-rejection reporting are also outside the current surface.

## Editor-driven scope

The surface was checked against generated CodeMirror, ProseMirror, and
WordGard bundles in `dev/wasm-web-runtimes/examples/browser-editors`. Notable
requirements include WordGard's stateful `map.keys().next()` listener queue,
ProseMirror's deferred `Promise.resolve().then(...)` observer flush, and the
three editors' ordered maps, sets, weak caches, and `Promise.all` joins.

`test/editor-primitives.test.js` keeps those observed patterns executable. It
tests the primitives independently of each editor's DOM facade and of syntax
features that MicroESNext has not added yet.
