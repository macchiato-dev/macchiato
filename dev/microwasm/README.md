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

Pseudocode uses normal technical notation: hex for byte values, masks and
addresses; ASCII character literals; `%`, shifts and compound assignments.
`u32(x)` interprets the i32 bits as unsigned; `>>>` is a logical right shift.
Ranges use `a..<b` (exclusive end) or `a..=b` (inclusive end), and `&&`/`||`
short-circuit. This is explanatory notation, not another compiled DSL.

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
It lists the twenty programs and six pages defining the Markdown renderer.
Two independent selectors choose rendered versus source Markdown, and original
versus filled counts versus hex. Hex is a fenced Markdown code block, rendered
like any other fence. The runnable demos instantiate the saved hex themselves.
Mermaid fences show their source, not diagrams. Life has an editable 16×16
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

`deno task test` runs 40 tests covering all twenty examples and the supplied
externref module. Cases include numeric bounds, memory sentinels, repeated
calls, malformed UTF-8, CSV quoting, output overflow and multi-generation Life.
Every document is assembled, round-tripped through resolved Markdown and hex,
then compiled and executed by WebAssembly. Test oracles do not replace the
Wasm implementations.

The Markdown renderer is itself handwritten Microwasm across
[six linked pages](renderer/00-module.md), including a page about
[repeated scanning patterns](renderer/02-scanning.md). It produces HTML in
linear memory without host imports or a JavaScript Markdown parser. Its
1,532-byte module uses fixed 1.25 MiB memory: at most 256 KiB of input and
768 KiB of output. Scans keep offsets rather than building an AST. Input and
output overflow trap; the viewer discards incomplete output.
Literal strings have one unsigned 8-bit length followed by their bytes, with
no terminator or variable-length decoding.

Only the subset used here is supported: headings, paragraphs, nested hyphen
lists and their indented continuations, fences, inline code, strong emphasis,
and simple links. Raw HTML is escaped. Links contain only `data-href`; the
small browser adapter enables `href` only for same-origin documents present
in the local build manifest. External links remain inert. This policy also
works beneath a deployment path prefix.

With the preview running, `deno task test:browser` checks all twenty examples
and six renderer pages in Chromium, tests all six content/display combinations,
checks local navigation and blocked links, interacts with forms and Life, and
saves screenshots in
`dist/browser/`. This optional test uses pinned Playwright tooling and requires
its Chromium installation; it is not shipped in the demo or required to build.
It has broader permissions because it launches a browser process. The test
puts browser working files under `dist/browser`, not `/tmp`.

The modules are small teaching programs, not production filter libraries.
Their documents define input formats, memory capacities and error behavior.
The JSON examples assume valid UTF-8; their output is not an HTML sanitizer.
The browser viewer runs these fixed trusted examples, not arbitrary uploaded
code. Module byte sizes exclude host UI and allocated linear memory.

## Transformation tools: in progress

The [fifty-tool plan](docs/transformations.md) tracks the larger conversion
goal. [Mad libs](transforms/03-mad-libs.md) is implemented:
template text and a binding list become substituted Markdown. Its 754-byte
Wasm module performs the substitution; the browser supplies two editable
textareas, independent code/rendered switches and a Run button. Failed runs
retain the previous output. User-written links remain inert in rendered views.

Try it at [the local transformation page](http://microwasm.localhost:3030/?tool=03-mad-libs).
`deno task test:transforms-browser` checks both panes, output edits, view
switches, failure recovery and mobile layout. The build also publishes the
source documents and hex alongside the ordinary examples.

[Unsigned number conversion](numbers/01-unsigned-integers.md) is the first
shared numeric primitive: a 390-byte module parses/formats exact 64-bit
integers in bases 2..36. Tests cover every digit byte, overflow, full-width
values and native-oracle round trips. JSON/binary64 conversion remains
unfinished; integer support is not a replacement for it.

[Hierarchical list to JSON](transforms/01-list-to-json.md) is now the second
working tool. It handles `{}`/`[]` nesting, quoted keys and strings, typed
scalars, escaping, and exact decimal spellings. Its 1,505-byte module imports
the 331-byte [JSON number validator](numbers/02-json-number.md) directly as
Wasm, sharing its memory. The host performs no JSON conversion.
Try [the local list converter](http://microwasm.localhost:3030/?tool=01-list-to-json).
The remaining 48 transformations are still pending.

## Provisional byte-list notation

A line beginning with the inline code span `[microwasm]` labels the following
nested Markdown list as executable bytes. It may have an explanation after
the inline code. The marker and list are both visible with a generic Markdown
renderer; there are no HTML comments or other hidden assembly directives.
In rendered terms, the marker captures the next `<ul>`, including its nested
lists. A separate `<ul>` needs another `[microwasm]` marker.

`[microwasm]`

- header: `00 61 73 6d 01 00 00 00` — Magic and version.

That is the actual notation, not a custom rendering extension. As with a
`file.txt` label before a code block, only this recognized label captures the
following block. Ordinary inline code elsewhere has no assembly meaning.
The list ends at the next unindented prose, heading, or other block; blank
lines within a list are fine. There is no closing directive. A marker without
a following list is an error. Markers inside fenced code examples are ignored.

A document may contain several labeled lists, separated by explanations,
pseudocode or flowcharts. Their bytes are concatenated in document order.

A future specialized Microwasm display can recognize these labeled blocks and
render them differently. The partial renderer currently displays ordinary
lists. That is separate from the source format: a generic Markdown
renderer still presents the full label and ordinary byte list. No custom
renderer is required to see which blocks participate in the program.

- Each list item has a unique identifier, a colon, an optional inline code
  span, and an optional explanation after an em dash.
- Two spaces add one level of nesting. A parent emits its own bytes first,
  followed by its children in order. Labels without bytes are useful groups.
- Hex bytes use pairs of hexadecimal digits. Grouping is cosmetic: `41 8010`
  and `41 80 10` emit the same bytes, in the written order.
- `{{size:label}}` emits the byte length of that item's complete subtree.
- `{{count:label}}` emits the number of that item's immediate children.
- `{{size:a+b}}` and `{{count:a+b}}` sum the respective values for several
  labels. This lets a section span separate pages without moving its code
  into the header page or generating hidden bytes.
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
