# Supported modern JavaScript subset

MicroESNext implements a focused set of newer primitives and syntax. This is
not a general claim of ECMAScript conformance.

## Syntax and async execution

Decimal and exponent literals compile to the optional `numbers` capability.
It preserves IEEE-754 values, including negative zero and NaN, while keeping
small integers as immediate i30 words. Addition of statically small integer
terms stays on the invariant opcode path; expressions requiring promotion use
the removable numeric path.

Arrow functions support expression and block bodies, lexical `this` and
`arguments`, and rejection as constructors. Untagged template literals support
cooked text, escapes, multiline text, and substitutions. Tagged templates are
not included.

Function declarations, function expressions, and arrows may be `async`.
`await` accepts values, native promises, and thenables; always resumes through
the Promise job queue; preserves locals and captured variables across repeated
suspensions; and turns uncaught exceptions into promise rejections. Async
methods and async generators are not part of this initial surface.

The Rust vertical slice directly emits bytecode for a deliberately narrow
`try { return|throw expression } catch [(name)] { return|throw expression }`
form. Catch targets are backpatched without an AST. Its handler and caught
value live on the guest stack, survive `await`, and are removed on both normal
and abrupt paths. General statements, nested lexical environments, `finally`,
and the complete ECMAScript grammar remain future compiler work.

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
