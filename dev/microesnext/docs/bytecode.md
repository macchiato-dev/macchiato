# Bytecode study

MicroESNext inherits MicroQuickJS's compact stack bytecode. Instructions have a
one-byte opcode followed by zero, one, two, or four bytes of immediate data.
`mquickjs_opcode.h` is the authoritative instruction list: it declares each
instruction's encoded size, stack inputs and outputs, and operand format. The
same table drives interpretation, stack-depth analysis, relocation, dumping,
and 64-to-32-bit bytecode conversion.

Function bytecode carries a constant pool, argument and local-variable names,
captured-variable descriptors, a maximum operand-stack depth, source mapping,
and nested function bytecode. `fclosure` instantiates a nested function and
connects its captured variables to the enclosing frame. Calls, returns,
exceptions, and `finally` already have direct instructions.

## Arrow functions

Arrow functions do not require a new instruction. Their parameters and body
use ordinary function bytecode, and `fclosure` creates the function. A function
metadata bit distinguishes arrows so closure creation captures the enclosing
`this`, calls restore that captured value, and construction can be rejected.
Expression bodies compile as an expression followed by `return`.

## Named function expressions

A named expression has a lexical self-binding that is not visible in its
enclosing scope. The optional `recursive_closure` instruction composes the
ordinary closure and environment-cell capabilities: it creates one cell,
places it first in the capture list, constructs the closure, and initializes
the cell with that closure. Unnamed expressions, arrows, and declarations do
not pay for this constructor, and builds omitting `recursive-functions` reject
its opcode.

## Receivers

Receiver-aware functions use `init_receiver_frame`, `load_this`, and
`return_receiver_locals`. The caller appends one hidden receiver after the
evaluated arguments. Frame initialization leaves the ordinary count and local
slots in their existing positions and keeps the receiver immediately after the
fixed local region. Temporary operands can therefore grow above it without
changing its address.

These instructions are optional rather than a new field in the invariant VM.
Ordinary closures and bytecode remain unchanged. The optional thenable driver
uses these instructions to invoke a guest `then` function with the source
object as its receiver; it schedules chained thenables as separate jobs.

## Strict equality

The optional `strict_equal` and `strict_not_equal` instructions each consume
two values and produce a tagged boolean. Their implementation is statically
composed with the enabled value representations: the identity-only build does
not link number or string storage, while scalar builds compare numbers and
string contents according to JavaScript strict-equality semantics. Collection
SameValueZero remains a distinct operation because its treatment of `NaN`
differs.

## Short-circuit logical operations

`jump_if_falsy_or_pop` implements `&&`; `jump_if_truthy_or_pop` implements
`||`. Each reads the top operand without copying it. When the operand selects
the expression result, the instruction jumps and leaves it in place. Otherwise
it pops that operand and falls through to the right expression. Forward targets
are ordinary relocation entries, so the same representation works inside
nested function bodies without native callbacks or an AST at runtime.

These instructions belong to `logical-operations`, not basic `control-flow`.
Consequently a machine needing loops and `if` but no logical expressions does
not decode them or link their truthiness composition.

## Numeric targets

`const_f64` belongs to number representation; `add_number`,
`subtract_number`, `multiply_number`, and promoted relational operations
belong to the separate number-operations capability. Numeric equality and
storage can therefore omit all arithmetic decoder arms.

The compiler target is explicit. A JavaScript-number target emits an invariant
i30 opcode only when its result is statically known to fit, and otherwise emits
the promoted operation. A bounded-i30 target emits only the smaller integer
instruction family and reports overflow at execution. This is a build target,
not a language-visible claim that JavaScript integers stop at 30 bits.

## Untagged template literals

Bare template literals do not require a new instruction. Cooked literal pieces
enter the existing constant pool. Each substitution uses the ordinary
expression compiler, and the pieces are combined with the existing `add`
instruction, whose string coercion supplies template interpolation semantics.
Tagged templates are intentionally not part of this milestone.

## Async functions and await

An async function body reuses ordinary frame, local, capture, and return
instructions. The optional `async_closure` constructor distinguishes its call
boundary from an ordinary closure: a call returns a pending Promise to the
caller while its body runs in an independent guest context. Builds omitting
`async-functions` neither decode that constructor nor link its closure and
invocation storage.

Declarations, anonymous function expressions, and arrows emit that same
constructor. A named recursive async expression emits
`recursive_async_closure`, whose separate composition crate adds a private
self cell to async closure storage. Builds needing async functions but not
recursive self identity do not decode or link that constructor.

`await` suspends after evaluating one operand. It retains the function's
arguments, locals, operand stack, program counter, exception state, and live
captured-variable references, then resumes with either a fulfilled value or a
thrown rejection.

The runtime stores suspended contexts in GC-visible engine objects and
schedules their continuation through the same bounded FIFO Promise job queue
used by `then`. A caller-supplied async frame array tracks only currently
running nested bodies; once a body reaches `await`, its heap continuation and
Promise reaction replace that scheduler frame. This preserves ordinary
bytecode on either side of an await while making suspension explicit.

The saved context contains the active stack range, frame and handler depths,
and program counter. The scheduler frame separately roots the caller context
and outer Promise. Captured mutable variables remain traced environment cells,
so compaction can relocate the entire graph without exposing raw offsets.

MicroESNext executes a resumed function on its ordinary compact VM stack. It
does not leave every async invocation permanently resident there: while the
function is suspended, its snapshot is an ordinary GC-visible value graph.
Fulfillment restores the awaited operand and continues after `await`;
rejection restores the same frame and enters its existing exception machinery
as though the await expression had thrown.

`try` records a catch target together with the current operand, call-frame, and
outer-handler depths. `end_try` removes that record on normal completion while
preserving the expression result. `throw`, including the abrupt completion
created by a rejected `await`, truncates the guest stack to the nearest record
and resumes at its catch target. None of these operations uses native Rust or
WebAssembly stack unwinding.

The bytecode format version is `2`. Version `1` readers cannot safely infer the
new function metadata or opcode numbering and must reject these artifacts.

Whenever the instruction table changes, tests must cover source execution,
bytecode compilation/loading, stack-size analysis, dumping, relocation, and
the 64-to-32-bit conversion path. An opcode working only in the interpreter is
not considered implemented.
