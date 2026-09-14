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

Building and running the examples needs no Rust/C compiler, WAT compiler,
npm dependency, or opcode assembler.
Instruction names in explanations are just explanations: only the written hex
bytes and the explicit placeholders produce bytes.

## Run the proof of concept

From this directory:

```sh
deno task test
deno task factorial
deno task build
deno task serve
```

The factorial command writes `dist/01-factorial.resolved.md`,
`dist/01-factorial.hex`, `dist/01-factorial.wasm`, and an offset map. It then
loads the hex file, instantiates its bytes, and calls `factorial(5)`.
The expected result is `120`.

`build` processes all twenty documents into `dist/pages/`. Each gets the original
Markdown, resolved Markdown, a label/line/byte-offset map, a `.hex` file, and a
validated `.wasm` file. The final step reads the saved hex file back from disk.
All generated output is gitignored. Neither the build nor the unit tests needs
network access.

Open [the local browser demo](http://localhost:8766/) after starting `serve`.
It lists the twenty programs and lets you run them, switch between source
Markdown, filled counts and hex, or download the Wasm. The viewer instantiates
the saved hex itself. It shows Markdown as source text; Mermaid flowcharts are
in the documents for readers that render Mermaid. Life has an editable 16×16
board, a step button and a play/pause control. Rebuilding needs no server restart.
The static `dist/pages/` directory can also be served under a path prefix;
its asset links are relative. The preview server binds all interfaces for use
inside a development VM/container and disables caching.

In the Macchiato workspace, the same built directory is also available at
[microwasm.localhost:3030](http://microwasm.localhost:3030/) through the ordinary
declarative directory handler, without shared `/-/` routes or a custom handler.
To register it in another local catalog, run this from the repository root:

```sh
node packages/macchiato/src/macchiato.js site add microwasm "$PWD/dev/microwasm/dist/pages"
```

Node is only used here for the existing Macchiato catalog CLI, not the build.

The notation follows the supplied handwritten module's progression from
explanation to bytes. [The reference notes](docs/handwritten-reference.md)
retain its final binary and explain which earlier working notes it corrected.
All [twenty examples](docs/examples.md) are implemented, from factorial through
quoted CSV-to-JSON and Game of Life. The reference module is an additional
test, not one of the twenty. Its original bytes are left intact, including its
documented zero-input behavior.

## Verification and boundaries

`deno task test` runs 25 tests covering all twenty examples and the supplied
externref module. Cases include numeric bounds, memory sentinels, repeated
calls, malformed UTF-8, CSV quoting, output overflow and multi-generation Life.
Every document is assembled, round-tripped through resolved Markdown and hex,
then compiled and executed by WebAssembly. Test oracles do not replace the
Wasm implementations.

With the preview running, `deno task test:browser` checks all twenty examples
in Chromium, interacts with the forms and Life board, and saves screenshots in
`dist/browser/`. This optional test uses pinned Playwright tooling and requires
its Chromium installation; it is not shipped in the demo or required to build.
It has broader permissions because it launches a browser process. The test
puts browser working files under `dist/browser`, not `/tmp`.

The modules are small teaching programs, not production filter libraries.
Their documents define input formats, memory capacities and error behavior.
The JSON examples assume valid UTF-8; their output is not an HTML sanitizer.
The browser viewer runs these fixed trusted examples, not arbitrary uploaded
code. Module byte sizes exclude host UI and allocated linear memory.

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
