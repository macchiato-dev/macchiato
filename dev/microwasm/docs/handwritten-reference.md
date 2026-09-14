# The handwritten reference

Benjamin Atkin supplied **Visualizing a WebAssembly module using WebAssembly**
as the starting point for this experiment. It derives function types, imports,
locals, calls, and a loop before joining their binary representations. The
same externref calls can build browser DOM elements or a host data structure.

The complete original is in the project conversation. This file preserves its
final `app4.js` binary verbatim (including byte grouping), rather than claiming
to reproduce every intermediate draft. The tests execute it without translating
its instructions or replacing its loop with host code.

## What carries over

- Work out the algorithm, memory layout, and host interface first.
- Explain binary structures with progressively more concrete list entries.
- Keep opcodes, indices, and operand encodings visible.
- Derive lengths only after the corresponding contents have been written.
- Keep the host small; prove that the module itself drives the calls.
- Use real Wasm validation and execution to check the assembled result.

Only lists labeled `[microwasm]` emit bytes in the new documents. Earlier
expansions can therefore stay in prose/lists without accidentally being emitted
twice. The count/size tool is bookkeeping, not a compiler from pseudocode.

## Final `app4.js` binary

```hex
00 61 73 6d
01 00 00 00
01 16 04
   60 02 7f 7f 01 6f
   60 01 6f 01 6f
   60 02 6f 6f 00
   60 02 6f 7f 00
02 3b 05
   01 6d 03 737472 00 00
   01 6d 07 7374723a686578 00 00
   01 6d 06 656c3a6e6577 00 01
   01 6d 08 656c3a746578743d 00 02
   01 6d 09 656c3a617070656e64 00 02
03 02 01 03
05 04 01 01 01 01
07 0f 02
  02 676f 00 05
  06 6d656d6f7279 02 00
0c 01 01
0a 4f 01
   4d
   02 01 7f 04 6f
   41 8010 41 03 10 00 21 03
   03 40
   20 02 41 08 70 45
   04 40
   20 03 10 02 21 04
   20 00 20 04 10 04
   0b
   20 02 41 01 10 01 21 05
   20 03 10 02 21 06
   20 06 20 05 10 03
   20 04 20 06 10 04
   20 02 41 01 6a 22 02
   20 01 49 0d 00 0b 0b
0b 16 01 004180100b0f646976626c6f636b726f7763656c6c
```

## Working notes versus final bytes

The final binary already fixes several intermediate notes:

- `i32.const` is `41`; `42` is `i64.const`.
- 2048 encodes as `80 10`, least-significant group first, not `10 80`.
  The immediate for `i32.const` is **signed** LEB128. For positive 2048 the
  signed and unsigned encodings coincide, but they do not always coincide:
  signed 64 is `c0 00`, while unsigned 64 is `40`.
- `stringNew` returns an externref. The early void `go` needs `drop` (`1a`)
  after the call; the final table instead stores returned references in locals.
- The table uses four externref locals, matching its local indices 3 through 6.
- `call` is `10`; an intermediate `08 02` is not the intended function call.
- Rows contain eight cells, not sixteen; the final remainder uses `41 08`.

These details follow the specification's
[instruction encodings](https://webassembly.github.io/spec/core/binary/instructions.html)
and [integer encodings](https://webassembly.github.io/spec/core/binary/values.html).

One remaining edge case is worth retaining as a lesson: `app4` is a do-while
loop. Calling `go(root, 0)` still emits one cell. Tests record that behavior
explicitly; they do not silently repair the supplied reference. Its intended
input is a positive byte length below the string-data offset at 2048.
