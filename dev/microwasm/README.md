# Microwasm

An experiment in writing executable WebAssembly binaries as Markdown documents:
pseudocode, flowcharts, and annotated, nested lists of machine-code bytes.
The source is the document, not WAT or a program which generates the document.

The workflow is deliberately visible:

1. Explain the algorithm in pseudocode and a flowchart.
2. Write the binary in Markdown lists, leaving counts and byte lengths open.
3. Resolve those placeholders and retain the filled-in Markdown.
4. Concatenate the bytes into a plain hex file.
5. Read that hex file back, validate the module, and instantiate it as Wasm.

There is no Rust/C compiler, WAT compiler, npm dependency, or opcode assembler.
Instruction names in explanations are just explanations: only the written hex
bytes and the explicit placeholders produce bytes.

## First executable slice

From this directory:

```sh
deno task test
deno task factorial
```

The factorial command writes `dist/01-factorial.resolved.md`,
`dist/01-factorial.hex`, `dist/01-factorial.wasm`, and an offset map. It then
loads the hex file, instantiates its bytes, and calls `factorial(5)`.
The expected result is `120`.

The notation follows the supplied handwritten module's progression from
explanation to bytes. [The reference notes](docs/handwritten-reference.md)
retain its final binary and explain which earlier working notes it corrected.
The complete target is twenty examples, not just factorial.
See [the example sequence](docs/examples.md).

## Provisional byte-list notation

`<!-- microwasm:start -->` and `<!-- microwasm:end -->` mark executable lists.
A document may have several such regions, separated by ordinary explanations,
pseudocode, or flowcharts. Their bytes are concatenated in document order.

- Each list item has a unique identifier, a colon, an optional inline code
  span, and an optional explanation after an em dash.
- Two spaces add one level of nesting. A parent emits its own bytes first,
  followed by its children in order. Labels without bytes are useful groups.
- Hex bytes use pairs of hexadecimal digits. Grouping is cosmetic: `41 8010`
  and `41 80 10` emit the same bytes, in the written order.
- `{{size:label}}` emits the byte length of that item's complete subtree.
- `{{count:label}}` emits the number of that item's immediate children.
- Both placeholders emit unsigned LEB128, not a fixed one-byte number.
- Forward references are allowed. Missing references, duplicate labels,
  malformed rows, and recursive size dependencies are errors.

Labels are only assembly bookkeeping. They do not infer branch depths, local
indices, types, opcodes, section IDs, or export names. Those bytes are written
in the document. Nesting cannot turn an incorrect instruction into a correct
one; the Wasm validator and example tests check the resulting program.

The binary layout follows the WebAssembly specification's
[module sections](https://webassembly.github.io/spec/core/binary/modules.html)
and [integer encodings](https://webassembly.github.io/spec/core/binary/values.html).
A section's length counts its payload, not its ID or length field. Function
bodies have their own lengths, and vectors have entry counts. These are distinct
quantities even when their small encodings happen to be the same byte.
