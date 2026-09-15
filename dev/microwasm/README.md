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
It lists the twenty programs and seven pages defining the Markdown renderer.
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

`deno task test` runs 169 tests covering all twenty examples and the supplied
externref module. Cases include numeric bounds, memory sentinels, repeated
calls, malformed UTF-8, CSV quoting, output overflow and multi-generation Life.
Every document is assembled, round-tripped through resolved Markdown and hex,
then compiled and executed by WebAssembly. Test oracles do not replace the
Wasm implementations.

The Markdown renderer is itself handwritten Microwasm across
[seven linked pages](renderer/00-module.md), including a page about
[repeated scanning patterns](renderer/02-scanning.md). It produces HTML in
linear memory without host imports or a JavaScript Markdown parser. Its
2,679-byte module uses fixed 1.25 MiB memory: at most 256 KiB of input and
768 KiB of output. Scans keep offsets rather than building an AST. Input and
output overflow trap; the viewer discards incomplete output.
Literal strings have one unsigned 8-bit length followed by their bytes, with
no terminator or variable-length decoding.

Only the subset used here is supported: headings, paragraphs, nested hyphen
lists and their indented continuations, fences, pipe tables, decimal character
references, inline code, strong emphasis, and simple links. Raw HTML is escaped.
Links contain only `data-href`; the
small browser adapter enables `href` only for same-origin documents present
in the local build manifest. External links remain inert. This policy also
works beneath a deployment path prefix.

With the preview running, `deno task test:browser` checks all twenty examples
and seven renderer pages in Chromium, tests all six content/display combinations,
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
values and native-oracle round trips.

[JSON decimal parsing](numbers/04-json-binary64.md) now converts strict JSON
number text to binary64 using [exact multiword arithmetic](numbers/03-multiword.md).
It handles nearest-even rounding, negative zero, subnormals and overflow.
Tests cover exact rounding midpoints, long digit tails, full-size input and
native-oracle comparisons. [Exact decimal expansion](numbers/05-exact-decimal.md)
formats the complete finite binary64 value and round-trips through that parser.
[Shortest finite decimal formatting](numbers/06-shortest-decimal.md) uses those
digits and the Wasm parser to choose the shortest round-tripping string, with
JavaScript's decimal notation rules. It is a reference implementation, not
a cached-power performance optimization.

[Integer-prefix parsing](numbers/07-parse-integer.md) implements `parseInt`
syntax in bases 2..36, with exact accumulation before binary64 rounding.
[Decimal-prefix parsing](numbers/08-parse-float.md) implements `parseFloat`
syntax, reusing Unicode whitespace and decimal conversion. Both preserve
negative zero, return NaN for missing numeric prefixes, and allow ignored
suffixes. [Binary64 radix formatting](numbers/09-radix-format.md) now covers
bases 2..36, including fractions, signed infinities and NaN. It selects the
shortest representation inside the exact rounding interval, with closest/even
ties. [Whole-string numeric conversion](numbers/10-whole-number.md) covers the
text part of `Number()`, requiring a complete decimal or unsigned prefixed
integer and allowing surrounding whitespace.
[Precision-controlled formatting](numbers/11-precision-format.md) implements
`toFixed`, `toExponential` and `toPrecision` numeric behavior, including
requested zeros, exact rounding ties and their different notation rules.

Choose the numeric entry point by its text rules:

| Module | Entry point | Behavior |
| --- | --- | --- |
| 04 JSON binary64 | `parse(start, end)` | Strict JSON number; invalid text traps |
| 07 Integer prefix | `parse(start, end, radix)` | `parseInt` syntax; ignored suffix |
| 08 Decimal prefix | `parse(start, end)` | `parseFloat` syntax; ignored suffix |
| 10 Whole number | `parse(start, end)` | `Number(text)` syntax; no junk suffix |
| 09 Radix format | `format(value, radix)` | Number string, bases 2..36 |
| 09 Radix format | `json(value)` | JSON scalar; nonfinite values become `null` |
| 11 Precision format | `fixed(value, digits)` | Fixed decimal places, 0..100 |
| 11 Precision format | `exponential(value, digits)` | Exponential notation, 0..100 fractional digits |
| 11 Precision format | `exponentialShortest(value)` | Exponential notation, omitted precision |
| 11 Precision format | `precision(value, digits)` | Significant decimal digits, 1..100 |

The JavaScript-style parsers return NaN for invalid text, but invalid memory
spans still trap. These byte interfaces do not perform object coercions.
All composed numeric modules share the JSON scanner's fixed four-page memory.
Formatting returns an explicit byte length at `0x10000`; there is no terminator.

[Hierarchical list to JSON](transforms/01-list-to-json.md) is now the second
working tool. It handles `{}`/`[]` nesting, quoted keys and strings, typed
scalars, escaping, and exact decimal spellings. Its 1,505-byte module imports
the [JSON number validator](numbers/02-json-number.md) directly as
Wasm, sharing its memory. The host performs no JSON conversion.
Try [the local list converter](http://microwasm.localhost:3030/?tool=01-list-to-json).
[Fenced JSON to hierarchical Markdown](transforms/02-json-to-list.md) is the
reverse tool. It checks the complete JSON grammar and preserves duplicate
keys, string escapes and number spellings while emitting the list directly,
without an intermediate object tree. Its module is 1,379 bytes, plus the
shared JSON number scanner; it also contains the pretty/compact entries and
the bounded compact-span entry used by the JSON Lines tools below.

[Fenced CSV to a Markdown table](transforms/04-csv-to-table.md) handles quoted
fields, escaped quotes, embedded line breaks and matching row widths. Its
1,004-byte module emits Markdown-safe cell text. The Wasm reader now renders
pipe tables and decimal character references, so the tool's Rendered view
shows an actual table.
[Markdown table to CSV](transforms/05-table-to-csv.md) is the reverse tool:
it decodes escaped cells, quotes CSV fields, and chooses a long enough code
fence to preserve embedded backticks. Its 1,479-byte module needs no imports.

[TSV to table](transforms/06-tsv-to-table.md) and
[table to TSV](transforms/07-table-to-tsv.md) share those implementations using
explicit TSV entries. Quotes stay literal, tabs delimit fields, and exporting
a field containing a decoded tab or line ending is rejected. Each 58-byte
adapter directly re-exports its dependency's Wasm function and memory; those
sizes exclude the dependency.

[Pretty-print JSON](transforms/12-json-pretty.md) and
[compact JSON](transforms/13-json-compact.md) reuse the JSON-to-list parser's
descent with different structural output. They preserve duplicate keys,
numeric spellings and string escapes instead of converting through an object
tree. Their 61/62-byte adapters directly re-export the shared Wasm entries;
these sizes exclude the 1,379-byte parser and 377-byte number scanner. The
browser downloads dependencies together and instantiates them in dependency
order, wiring actual Wasm exports without conversion callbacks.
Try [pretty-printing](http://microwasm.localhost:3030/?tool=12-json-pretty) or
[compacting](http://microwasm.localhost:3030/?tool=13-json-compact).

[JSON Lines to array](transforms/14-json-lines-to-array.md) validates each
record and appends it directly to the output. [Array to JSON Lines](transforms/15-array-to-json-lines.md)
compacts and validates the full array, then replaces only top-level commas
with line endings. Nested values and string escapes stay intact. Empty streams
and arrays round-trip; blank record lines are rejected. Their shared module is
896 bytes, plus the parser and scanner above; the reverse entry's adapter is
60 bytes. Neither direction builds an object tree or copies the input.
Try [JSON Lines to array](http://microwasm.localhost:3030/?tool=14-json-lines-to-array)
or [array to JSON Lines](http://microwasm.localhost:3030/?tool=15-array-to-json-lines).

[JSON rows to table](transforms/10-json-rows-to-table.md) converts rectangular
arrays of row arrays, using the first row as the header. Cells remain explicit
JSON values, preserving string/number distinctions, nested structures and
original number spellings. Its 782-byte module (plus the shared parser and
number scanner) validates once using the shared parser,
makes one bounded scratch copy, and scans row/cell boundaries while escaping
Markdown. Input is never changed, and empty outer arrays produce empty output.
Try [the typed row converter](http://microwasm.localhost:3030/?tool=10-json-rows-to-table).

[Typed table to JSON rows](transforms/11-table-to-json-rows.md) reverses that
representation. It decodes each cell into bounded scratch and validates it as
one complete JSON value before appending it. A cell cannot smuggle extra
columns through commas or unmatched brackets. Its 1,348-byte module imports
the shared parser and memory; the original table is not modified. The parser
can now read disjoint scratch spans, using a new memory-wide numeric scanner
entry while the original first-page `valid` API keeps its existing bounds.
Try [the reverse typed-table converter](http://microwasm.localhost:3030/?tool=11-table-to-json-rows).

[JSON objects to table](transforms/08-json-objects-to-table.md) collects an
ordered union of property names across all rows. Blank cells represent absent
properties; `null` remains explicit. Its 1,187-byte module imports the parser
and an [871-byte JSON string helper](transforms/00-json-string-keys.md).
The comparator decodes UTF-8 and JSON escapes into UTF-16 units without
allocating strings, so equivalent key spellings share one column. Duplicate
keys within a row are rejected; nested value tokens are preserved.
Try [the object-table converter](http://microwasm.localhost:3030/?tool=08-json-objects-to-table).

[Table to JSON objects](transforms/09-table-to-json-objects.md) reverses the
object-table representation. Blank cells omit properties, and each remaining
cell is validated independently. Header spellings are retained, with decoded
duplicate names rejected. Its 1,182-byte module imports the parser, comparator
and the typed-row module's shared cell decoder. It keeps original header spans
rather than a decoded object tree. See its source for memory bounds and the
tradeoff of decoding short headers again when emitting properties.
Try [the reverse object-table converter](http://microwasm.localhost:3030/?tool=09-table-to-json-objects).

[Hierarchical list to YAML](transforms/16-list-to-yaml.md) emits two-space block
mappings/sequences with quoted strings, empty flow containers and exact number
spellings. Its 1,285-byte module imports the list compiler and string helpers.
It rejects duplicate mapping keys and unpaired surrogates, and switches long
keys to explicit YAML syntax. The shared helper now exposes bounded code-unit
iteration as well as equality. Tests use `@std/yaml@1.2.0` as an independent
oracle only; the browser still runs just the handwritten Wasm conversion.
Try [the YAML writer](http://microwasm.localhost:3030/?tool=16-list-to-yaml).

[Block YAML to a list](transforms/17-yaml-to-list.md) completes the pair for
the documented block-data subset. Its 1,582-byte module walks indentation;
a shared 1,681-byte scalar module handles plain and quoted values using the
existing Wasm JSON parser, number validator and Unicode iterator. It accepts
the writer's explicit long keys, rejects duplicate decoded keys, and retains
source key order and number spelling. Tests cover 500 generated round trips,
exact input/output limits and recovery after errors. Neither helper is counted
as an additional tool. Try [the YAML reader](http://microwasm.localhost:3030/?tool=17-yaml-to-list).

[Hierarchical list to TOML](transforms/18-list-to-toml.md) emits root
assignments, nested inline tables and mixed arrays. Its 1,377-byte module
imports the list compiler and string helpers. It rejects null, non-object
roots, duplicate decoded keys and integers outside the signed 64-bit range.
Keys stay quoted (a dot is not a table path); strings and numeric spellings
are preserved through TOML-compatible escaping and direct numeric copying.
The test-only TOML parsers do not ship with the browser tool.
Try [the TOML writer](http://microwasm.localhost:3030/?tool=18-list-to-toml).

[TOML assignments to a list](transforms/19-toml-to-list.md) reads the writer's
format plus bare/literal keys, literal strings, comments and multiline arrays.
It removes leading plus signs and numeric digit separators without rounding.
The 2,032-byte module uses an 833-byte shared TOML string reader, plus the
existing number and string-key helpers. This is an assignment/inline-table
subset: table headers, dotted paths, dates and triple-quoted strings are not
accepted. The docs distinguish that subset from a complete TOML parser.
Try [the TOML reader](http://microwasm.localhost:3030/?tool=19-toml-to-list).

[INI sections to a list](transforms/20-ini-to-list.md) reads section headers
and string-valued assignments. Assignments before any header become an unnamed
section; named empty sections remain present. The 1,552-byte module shares the
Wasm Unicode/key comparator. Its documented dialect supports `=` and `:`,
whole-line comments and LF/CRLF, without interpolation or type inference.
Duplicate sections/keys, malformed UTF-8 and unsupported lines are rejected.
The test-only Deno INI parser is not shipped with the browser tool.
Try [the INI reader](http://microwasm.localhost:3030/?tool=20-ini-to-list).

Twenty transformations are implemented: tools 1–20 in the plan.
The remaining 30 are pending.

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
