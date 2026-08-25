# Supported modern JavaScript subset

MicroESNext implements a focused set of newer primitives and syntax. This is
not a general claim of ECMAScript conformance.

## Syntax and async execution

`undefined`, `null`, `false`, and `true` compile to tagged values in the
invariant VM. They require no heap allocation and no optional capability.

Decimal and exponent literals compile to the optional `numbers` capability.
It preserves IEEE-754 values, including negative zero and NaN, while keeping
small integers as immediate i30 words. Addition of statically small integer
terms stays on the invariant opcode path; expressions requiring promotion use
the removable numeric path.

The removable integer-operations slice adds subtraction, multiplication, and
`<`/`>` comparisons with ordinary multiplicative, additive, then relational
precedence. Together with local assignment and `while`, it can run a
source-compiled factorial loop with `n > 1` as its stopping condition without
linking boxed IEEE-754 numbers. Results outside the i30 range currently fail
rather than promote, so this is a deliberately bounded programming subset, not
yet full JavaScript numeric semantics.

Strict equality and inequality (`===` and `!==`) are a separate removable
capability. Immediate values, objects, and symbols compare by identity. When
composed with strings, independently allocated equal strings compare by
content; when composed with numbers, `+0` equals `-0` and `NaN` remains unequal
to itself. This is deliberately separate from the SameValueZero operation used
by Map and Set, where `NaN` keys compare equal. Coercive `==` and `!=` are not
yet included.

These scalar features are independent. In particular, `equality,numbers`
contains no string constructor, string bytecode, atom table, or string-aware
equality path. Guest code in that build has no operation that can create a
string value or place one in a variable; adding numeric equality does not imply
a general dynamically typed scalar bundle.

Arrow functions support expression and block bodies. Lexical `this` and
`arguments`, and rejection as constructors, remain compiler work. Untagged
template literals support cooked text, escapes, multiline text, and
substitutions. Tagged templates are not included.

The current compiler accepts `async function` declarations, anonymous async
function expressions, and async arrows with expression or block bodies.
Runtime async closures return their outer Promise before an awaited body
finishes, and nested async calls restore each ordinary caller in order—even
when the nested call begins after its caller has resumed. `await` on a value or
engine Promise resumes through the Promise job queue; synchronous throws
reject the outer Promise. Rejections after suspension propagate through nested
awaits and enter restored guest `catch` handlers. Named async expressions
retain a private self-binding through the removable recursive-async
composition. An optional async resolution policy assimilates object thenables
returned by an async function or used as the operand of `await` through the
bounded thenable-job queue. Source-visible Promise APIs, async methods, and
async generators remain compiler/runtime work rather than implied support.

The current Rust compiler slice also emits function declarations, anonymous
function expressions, single- or parenthesized-parameter arrows, postfix calls,
and ordered parameter slots directly to bytecode. Arrow expression and block
bodies share the ordinary closure compiler rather than adding an opcode. A
function expression may be called immediately or retained in a local, and all
three forms use the same capture analysis. Both declared parameters and call
arguments have a `u16` count. Argument-to-local frame setup is a removable
capability rather than a cost borne by functions without parameters. Named
function expressions get a private self-binding backed by a removable
recursive-function constructor, allowing recursion without leaking the name
into the enclosing scope. The optional receiver runtime can enter a closure
with an explicit receiver, expose it through receiver-specific frame bytecode,
and leave the frame without changing ordinary parameter/local positions.
Source compilation of `this`, method-call receiver preservation, `arguments`,
constructors, and full declaration hoisting remain compiler work.

Mutable closure semantics use optional traced environment cells. Compiler
capture analysis boxes only bindings that cross a function boundary; sibling
closures and later writes by the outer frame share the same cell. This avoids
turning every lexical local into a heap allocation merely because some builds
support closures. A self-referential declaration initializes its closure into
that same cell, providing the identity needed by recursive calls. Nested
function declarations are appended with explicit bytecode relocation records;
captures can be forwarded through intermediate functions without allocating a
second cell for the same binding. Branch, loop, catch, and nested-function
targets share that relocation path. Recursive source calls therefore stay on
guest VM frames rather than consuming the native Rust stack.

The Rust vertical slice directly emits bytecode for a deliberately narrow
`try { return|throw expression } catch [(name)] { return|throw expression }`
form. Catch targets are backpatched without an AST. Its handler and caught
value live on the guest stack, survive `await`, and are removed on both normal
and abrupt paths. General statements, nested lexical environments, `finally`,
and the complete ECMAScript grammar remain future compiler work.

## Collections

Unique symbols are available as a removable primitive and compose directly as
object, Map, and Set keys. Descriptions may be absent or ordinary strings, but
do not affect equality. The global symbol registry remains future work. The
realm-owned `Symbol.iterator` identity is a separate capability rather than
making every symbol build retain realm state or an atom table. Small realms can
omit its description string, while string-capable realms can supply the
standard `"Symbol.iterator"` description.

`Map` and `Set` provide constructors from arrays, ordered storage,
SameValueZero key comparison, `size`, `get`, `set`, `add`, `has`, `delete`,
`clear`, `forEach`, and stateful `keys`, `values`, and `entries` iterators.
Iterators remain live while entries are deleted or appended.
SameValueZero is statically composed: boxed NaNs and signed zero work when the
number capability is present, and independently allocated equal strings work
when strings are present. Neither comparison path enters collection-only
builds.

The Rust engine keeps iterator cursors in the guest arena, so they relocate and
retain their source without a native allocation. Array-value iteration and
Map/Set key/value iteration are independent adapters. Map entry iteration is a
third adapter because its pair results require array allocation. A separate
result-object capability creates relocatable `{ value, done }` objects using
cached atom identities. It accepts the same allocation-free `Option<Value>`
returned by either source adapter. Cursor-only builds omit its object, atom, and string
dependencies.
Entry-pair allocation and guest calls remain above this layer. Binding and
inherited lookup of the realm-local `Symbol.iterator` are available separately
from function validation and invocation; this keeps the protocol identity
useful without forcing closures into every iterable build.

`WeakMap` and `WeakSet` provide constructors from arrays and their usual
`get`, `set`, `add`, `has`, and `delete` operations. Keys must be objects. The
collector treats their entries as ephemerons: a live key retains its value,
while a collection alone does not retain its keys.

## Promise

The current runtime slice provides compact pending/fulfilled/rejected records,
reaction lists, and a caller-owned FIFO job ring. Optional native resolution
adopts another engine Promise, including its eventual rejection, without
linking object property lookup. Async function return uses this path.

Self-resolution rejects with a compact guest TypeError value. Optional
one-shot resolving functions share an `alreadyResolved` cell. The thenable
composition reads an ordinary object's data-property `then`, verifies that it
is a guest closure, and schedules it with the object as `this`. A throw before
resolution rejects; a throw or second resolver call afterward is ignored.
Resolving with another thenable returns a separately rooted follow-up job, so
chains remain deferred and never recurse on the Rust or WebAssembly stack.

Accessors and proxies for `then`, async `then` closures, source-visible
`Promise`, `then`, `catch`, `finally`, `resolve`, `reject`, `all`, and `race`,
subclass constructors, species, and unhandled-rejection reporting remain work
rather than claimed support.

## Editor-driven scope

The surface was checked against generated CodeMirror, ProseMirror, and
WordGard bundles in `dev/wasm-web-runtimes/examples/browser-editors`. Notable
requirements include WordGard's stateful `map.keys().next()` listener queue,
ProseMirror's deferred `Promise.resolve().then(...)` observer flush, and the
three editors' ordered maps, sets, weak caches, and `Promise.all` joins.

`test/editor-primitives.test.js` keeps those observed patterns executable. It
tests the primitives independently of each editor's DOM facade and of syntax
features that MicroESNext has not added yet.
