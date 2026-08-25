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

## Untagged template literals

Bare template literals do not require a new instruction. Cooked literal pieces
enter the existing constant pool. Each substitution uses the ordinary
expression compiler, and the pieces are combined with the existing `add`
instruction, whose string coercion supplies template interpolation semantics.
Tagged templates are intentionally not part of this milestone.

## Async functions and await

An async function can reuse ordinary closure and call instructions, with a
function metadata bit selecting Promise-returning entry and completion.
`await`, however, cannot be represented by the existing synchronous bytecode
without source-level control-flow rewriting. It must suspend after evaluating
one operand, retain the function's arguments, locals, operand stack, program
counter, exception state, and live captured-variable references, then resume
with either a fulfilled value or a thrown rejection.

MicroESNext therefore adds one `await` instruction. Async entry and return are
metadata-driven rather than separate opcodes. The runtime stores suspended
frames in GC-visible engine objects and schedules their continuation through
the same FIFO Promise job queue used by `then`. This preserves ordinary
bytecode for everything on either side of an await while making suspension an
explicit, auditable boundary.

The saved frame contains the active stack range, the frame-pointer and
program-counter offsets, the outer promise, and the live captured-variable
references. A captured variable normally points directly into the active VM
stack. At suspension it is detached to its heap value while retaining enough
storage to be reattached; at resumption its signed stack-relative offset is
used to reconnect it to the reconstructed frame. This is a stack-layout
change, not merely an extra parser production.

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
