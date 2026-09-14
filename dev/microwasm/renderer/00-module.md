# A Markdown renderer written in Microwasm

This is the renderer used to read these pages. Its instructions are handwritten
WebAssembly bytes, not a JavaScript Markdown parser called from Wasm. The host
copies in UTF-8, calls `run(length)`, then reads HTML back from linear memory.
There are no imports. This is a partial renderer, intentionally scoped to these
documents rather than CommonMark compliance.

## Assembly order

- [Output primitives](01-output.md): bounded writes, escaping and literals.
- [Scanning patterns](02-scanning.md): reusable searches and escaped spans.
- [Inline constructs](03-inline.md): code, strong emphasis and links.
- [Block structure](04-blocks.md): paragraphs, headings, fences and nested lists.
- [Tables and character references](06-tables.md): pipe rows and escaped cells.
- [Literal data](05-data.md): the exact HTML strings used by the code.

The build concatenates this page and those six pages in that order before
assembly. Labels are module-wide. A sum such as `{{size:a+b}}` counts two
separately documented records; it does not copy their bytes or compile code.
This keeps the code-section length correct across page boundaries.

## Deliberate limits

Support ATX headings, paragraphs, hyphen lists indented in two-space steps,
triple-backtick fences, pipe tables, decimal character references, inline
backticks, `**strong**`, and `[label](target)`.
Mermaid fences display their source exactly like other fences. Inline nesting
inside links or strong emphasis is not implemented; those spans are escaped
text. Raw HTML and unsupported syntax remain text, never executable markup.

Links become `<a data-href="...">`. The renderer never emits `href`, scripts,
images, styles, event attributes or remote resource requests. A host may enable
navigation separately. This demo enables only links to known local documents.

Input is at `0`, capped at `0x40000` bytes. Output is at `0x40000`, ending before
`0x100000`. HTML literals live at `0x100000`. The fixed memory has 20 pages;
an overflow traps and the host discards partial output. State resets each run.

```text
run(length):
    if u32(length) > 0x40000: trap
    cursor = 0x40000; list_depth = 0
    scan lines and emit block/inline HTML
    close open blocks
    return cursor - 0x40000
```

```mermaid
flowchart LR
    A[UTF-8 input] --> B[Line scanner]
    B --> C[Block structure]
    C --> D[Inline scanner]
    D --> E[Escaping and bounded output]
    E --> F[HTML with data-href links]
```

## Signatures and function indices

- Type 0: `(i32) -> i32`, run.
- Type 1: `(i32) -> ()`, emit, text, literal, close-lists.
- Type 2: `(i32, i32) -> ()`, escaped span, inline span.
- Type 3: `(i32, i32, i32) -> i32`, find a byte.
- Type 4: `(i32, i32) -> i32`, character-reference recognition.
- Functions: emit 0, text 1, literal 2, find 3, escaped 4, inline 5,
  close-lists 6, run 7, table-row 8, table 9, character-reference 10.
- Globals: output cursor 0, open-list depth 1.

`[microwasm]`

- md-header: `0061736d 01000000`
- md-type-section: `01 {{size:md-types}}`
  - md-types: `05 60 01 7f 01 7f 60 01 7f 00 60 02 7f 7f 00 60 03 7f 7f 7f 01 7f 60 02 7f 7f 01 7f`
- md-function-section: `03 {{size:md-functions}}`
  - md-functions: `0b 01 01 01 03 02 02 01 00 03 03 04`
- md-memory-section: `05 {{size:md-memories}}`
  - md-memories: `01 01 14 14`
- md-global-section: `06 {{size:md-globals}}`
  - md-globals: `02 7f 01 41 808010 0b 7f 01 41 00 0b`
- md-export-section: `07 {{size:md-exports}}`
  - md-exports: `02 03 72756e 00 07 06 6d656d6f7279 02 00`
- md-code-section: `0a {{size:md-code-count+emit-record+text-record+literal-record+find-record+escaped-record+inline-record+close-record+run-record+row-record+table-record+entity-record}}`
- md-code-count: `0b`

The following page starts the first function body, continuing the same code
section. [Next: output primitives](01-output.md).
