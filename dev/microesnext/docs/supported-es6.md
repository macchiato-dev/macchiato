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

The i30 range is an internal immediate-value optimization, not a visible
JavaScript integer limit. With `numbers` enabled, the IEEE-754 precision
boundary is `2^53`: that value itself is representable, but `2^53 + 1` is not
distinct from it. Consequently `Number.MAX_SAFE_INTEGER` is `2^53 - 1`.
Integer-only compositions intentionally expose a smaller bounded subset;
full numeric compositions promote results that no longer fit an i30.

Compiler callers select that distinction through `CompileOptions`: the
default JavaScript target promotes, while `NumberMode::BoundedI30` produces
bytecode for a runtime that intentionally omits number storage and promoted
operations. The compiler retains direct i30 instructions for statically proven
small results in either target.

The bytecode generator is progressive as well as the runtime. Its current
Cargo gates independently remove number representation, promoted and bounded
number operators, strict equality, and logical operators. When a gate is
absent the parser does not consume that syntax, so callers receive the same
ordinary grammar error they would get for another unexpected token. The
`source-positions` feature controls whether `CompileError` retains the source
offset; compact build-time uses can omit that field. Array literals are an
independent parser feature. Object literals and property access compose the
object, atom, and string bytecode vocabulary, without adding those paths to an
array-only or scalar-only generator.

Property-assignment statements are separately gated from object literals and
reads. The current source form accepts `local.name = value;` and constructor
receiver initialization such as `this.name = value;`. Its opcode consumes the
object, interned key, and value without leaving an unused expression result, so
it needs no general stack-cleanup feature. Assignment expressions, computed
keys, chained assignment, and direct writes through an outer capture remain
separate work.

The removable integer-operations slice adds subtraction, multiplication, and
`<`/`>` comparisons with ordinary multiplicative, additive, then relational
precedence. Together with local assignment and `while`, it can run a
source-compiled factorial loop with `n > 1` as its stopping condition without
linking boxed IEEE-754 numbers. Results outside the i30 range currently fail
rather than promote, so this is a deliberately bounded programming subset, not
yet full JavaScript numeric semantics.

JavaScript Number division and remainder are independent product-level
features. `/` produces IEEE-754 semantics, including infinities and NaN. `%`
preserves immediate integer results where possible and boxes cases such as
negative zero or non-integer operands. They have separate crates, bytecodes,
compiler gates, and VM match arms because the linked floating remainder helper
is much larger than division. Omitting either token family leaves it unconsumed
as ordinary unexpected syntax.

Unary numeric negation is independently removable from those binary
operations. Its bounded build accepts i30 operands and reports overflow; the
JavaScript Number composition keeps nonzero i30 results immediate, promotes
the asymmetric minimum, boxes `-0` so its sign remains observable, and applies
primitive Number coercion. Unary `+` is its own removable bytecode/compiler
gate: booleans and null become immediate i30 values, undefined becomes boxed
NaN, and existing i30 and boxed numbers are retained. Strings and objects are
rejected until separately removable string parsing and `ToPrimitive`
compositions exist. Prefix operators are collected iteratively before
emission, so mixed chains do not recurse on the native stack. Compiler builds
with only one unary family retain a smaller specialized scanner. A compiler
selecting only `number-negation` can emit the promoted instruction without
also retaining decimal and exponent literal parsing; selecting `numbers` adds
those literal forms.

The independent `string-number-coercion` composition extends those same unary
instructions to string operands. It trims the ECMAScript whitespace and line
terminator set, accepts decimal `StringNumericLiteral`, signed `Infinity`, and
unsigned binary/octal/hex integer forms, preserves negative zero, and returns
NaN for invalid input. It does not add object conversion or make every
string-enabled runtime retain numeric parsing. Decimal source literals and
this coercion share `microesnext-decimal-to-f64`; omitting both removes its
exact fast path and bounded correctly-rounded fallback from the linked build.

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

`typeof` is independently removable and returns the standard strings for
undefined, booleans, numbers, strings, symbols, functions, and objects,
including JavaScript's `typeof null === "object"` rule. Boxed numbers, symbols,
async closures, and Promise resolver functions participate only when their
separate representation features are composed. Repeated and mixed unary forms
such as `typeof typeof value` and `typeof +value` preserve right-to-left unary
evaluation. A build without `typeof` does not consume the keyword.

Ordinary `instanceof` is split across callable-object records, property
lookup, and allocation-free prototype traversal. The operator has its own
bytecode, compiler, VM, and facade gates; omitting it leaves the keyword
unconsumed and preserves the pre-existing relational parser. Its current
runtime accepts callable objects with an ordinary object-valued `prototype`
property. With the independent `constructors` gate, synchronous `function`
declarations and expressions are wrapped in ordinary callable objects with a
cyclic `.prototype.constructor`; arrows and async functions remain compact,
non-constructible closure records. The separately removable `construction`
gate compiles direct `new Constructor(arguments)` expressions, creates a
receiver whose prototype is the constructor's current object-valued
`prototype`, exposes it as `this`, and implements the ordinary primitive- versus
object-return rule. The preserved receiver stays below the ordinary call frame,
so construction adds no persistent VM field. A direct identifier or member
constructor may omit parentheses and then uses the same zero-argument opcode.
Parenthesized constructor expressions, post-call member access,
`Symbol.hasInstance`, bound functions, and host constructors are not implied by
this initial path. A named function's
private self cell is rebound to the wrapper by the independent
`recursive-constructors` composition, so calls and construction observe the
same function identity. Function declarations already reuse their ordinary
captured declaration cell and do not need that opcode.

The `classes` slice initially accepts a named declaration containing exactly
one `constructor`. It emits a distinct class-constructor record rather than
lowering the declaration to an ordinary function, so calling it without `new`
is a type error. Constructor parameters, `this` property initialization,
explicit returns, and the implicit `this` result compose with existing receiver
and construction rules. Methods, `extends`, fields, class expressions, and
static initialization are not included by this focused gate.

Logical AND and OR (`&&` and `||`) are another removable composition. They
short-circuit evaluation and return the selected operand rather than coercing
it to a boolean. Unary `!` uses the same selected truthiness policy and returns
a tagged boolean. The compiler counts repeated negations before parsing their
operand, avoiding native recursion for inputs such as `!!!!!!!!value`. Their
branch instructions retain the left operand when it
wins and pop it before evaluating the right operand otherwise. `&&` binds more
tightly than `||`, while strict equality and relational arithmetic bind above
both. Number-only and string-only truthiness are tested as separate Cargo
feature combinations.

Arrow functions support expression and block bodies. Lexical `this` and
`arguments`, and rejection as constructors, remain compiler work. Untagged
template literals support cooked text, escapes, multiline text, and
substitutions. Tagged templates are not included.

The Rust compiler currently emits single-quoted, double-quoted, and
no-substitution template strings directly into the removable string bytecode.
It accepts the compact escape set used by the current examples and preserves
UTF-8 source bytes. `${...}` substitution remains in the C behavioral oracle
until general JavaScript addition/coercion is composed in Rust; a string-only
compiler rejects it at the dollar sign rather than silently changing its
meaning.

Strict concatenation is a separate runtime and compiler capability. When both
operands are proven string literals, it emits `ConcatenateStrings` and joins
their arena bytes without a temporary Rust allocation. It deliberately does
not stand in for dynamic JavaScript `+`, `ToPrimitive`, or `ToString`.

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
