# YAML line spans and scalar decoding

This is a shared executable pattern for the YAML reader, not another tool
in the fifty-tool count. It separates one-line scalar syntax from indentation
and container handling. It imports actual Wasm JSON validation and string
iteration; no host YAML parser participates in the conversion.

## Three span operations

`analyze(start, end)` returns `(dataEnd, afterColon)`. It removes a trailing
comment beginning with `#` at a separation boundary, and trailing spaces/tabs.
An outside-quote colon followed by separation or end is a mapping delimiter;
otherwise afterColon is zero. Using the position after the colon keeps a
colon at address zero distinguishable from no colon. Quoting is recognized only at the beginning of
the span, so the apostrophe in `it's fine` does not open a quoted scalar.
Once a mapping colon is found, analyze its value separately. This operation
does not validate the scalar's type or escape sequences.

`quoteEnd(start, end)` returns the exclusive end of a single- or double-quoted
token, not necessarily the entire input span. Single quotes double to escape
an apostrophe; backslashes skip one byte in double quotes. Incomplete strings
trap. Both scanning operations accept bounded spans anywhere in four-page
memory, including the reader's already emitted JSON-quoted keys.

`scalar(start, end, output, isKey)` returns the exclusive output end. Input is
in the first page; output is in the middle two pages. It emits one token in
the hierarchical-list notation, without indentation or a trailing newline:

- Double-quoted values use JSON escapes, validated as a complete JSON string.
- Single-quoted values support doubled apostrophes and become JSON strings.
- Plain strings begin with an ASCII letter, underscore, or non-ASCII text.
- JSON-shaped numbers retain their spelling and receive the `= ` marker.
- Lowercase, uppercase and title-case `true`, `false`, and `null` become
  lowercase typed values; mixed-case spellings such as `tRuE` stay strings.
- Empty values become `= null`; empty unquoted keys are rejected.
- Empty flow containers become `{}` or `[]`; nonempty flow syntax is rejected.
- Keys must be strings; quote numeric or Boolean-looking names explicitly.

Numeric styles outside JSON, including octal/hex, leading plus, and `.inf`,
must not silently become different types. They are rejected by the restricted
plain-string start rule. Quote them to keep them as strings. Tags, aliases,
block scalars, directives, and YAML-only double-quote escapes are likewise
outside this reader's subset. The reader handles collections and indentation.

See [YAML 1.2.2](https://yaml.org/spec/1.2.2/) for the broader language. This
module intentionally does not claim to implement all of it. A test-only YAML
parser checks accepted examples, alongside exact list-token checks.

## Pattern: copy only after classification

Analyze a scalar before choosing its writer. JSON quotes go through the
existing JSON parser; single quotes and plain text go through a small JSON
quote writer. The emitted string is then checked with the shared iterator
for valid Unicode scalars. Lone surrogate units trap. Plain and single-quoted
source cannot smuggle raw non-printable characters through generated escapes.
Explicit JSON Unicode escapes may represent controls in double-quoted input.

```text
trim and analyze the source span; reject an unexpected mapping colon
if empty: emit null, unless a key is required
if JSON quoted: validate and append it
else if single quoted: un-double apostrophes and JSON-escape the content
else if an empty container: validate and append its marker
else if a Boolean/null or JSON number: emit a typed token, unless a key
else: require a plain-string start and JSON-quote its bytes
check emitted strings for valid Unicode scalar sequences
```

Original input is unchanged. All output stores are bounded by `0x30000`.
Only the JSON parser's fixed twelve literal bytes occupy scratch; this
module allocates no temporary string table or heap. Errors may leave partial
output but it must not be published. Every scalar call resets its own output
cursor, so the next call can recover without creating another instance.

## Module

Imports: compact-span 0 from `p`, next-unit 1 from `k`, numeric-valid 2 from
`n`, and `p.memory`. Defined functions: scalar 3, emit 4, copy 5, quote-end 6,
analyze 7, Unicode-check 8, quote-byte 9, word-kind 10, trim-start 11.
The single global is the output cursor. `isKey` must be 0 or 1.

`[microwasm]`

- ys-header: `0061736d 01000000`
- ys-type-section: `01 {{size:ys-types}}`
  - ys-types: `07 60 04 7f 7f 7f 7f 01 7f 60 03 7f 7f 7f 03 7f 7f 7f 60 02 7f 7f 01 7f 60 01 7f 00 60 02 7f 7f 00 60 02 7f 7f 02 7f 7f 60 03 7f 7f 7f 00`
- ys-import-section: `02 {{size:ys-imports}}`
  - ys-imports: `04 01 70 0b 636f6d706163745370616e 00 00 01 6b 04 6e657874 00 01 01 6e 05 76616c6964 00 02 01 70 06 6d656d6f7279 02 01 04 04`
- ys-function-section: `03 {{size:ys-functions}}`
  - ys-functions: `09 00 03 04 02 05 06 03 02 02`
- ys-global-section: `06 {{size:ys-globals}}`
  - ys-globals: `01 7f 01 41 00 0b`
- ys-export-section: `07 {{size:ys-exports}}`
  - ys-exports: `04 06 7363616c6172 00 03 07 616e616c797a65 00 07 08 71756f7465456e64 00 06 06 6d656d6f7279 02 00`
- ys-code-section: `0a {{size:ys-code}}`
  - ys-code: `09`
    - ys-scalar-record: `{{size:ys-scalar-body}}`
      - ys-scalar-body: `01 04 7f`
        - ys-scalar-bound: `20 00 20 01 4b 20 01 41 808004 4b 72 20 02 41 808004 49 72 20 02 41 80800c 4b 72 20 03 41 01 4b 72 04 40 00 0b`
        - ys-scalar-trim: `20 02 24 00 20 00 20 01 10 0b 21 00 20 00 20 01 10 07 21 04 21 01 20 04 04 40 00 0b`
        - ys-scalar-empty: `20 00 20 01 46 04 40 20 03 04 40 00 0b 41 3d 10 04 41 20 10 04 41 ee00 10 04 41 f500 10 04 41 ec00 10 04 41 ec00 10 04 23 00 0f 0b`
        - ys-scalar-byte: `20 00 2d 00 00 21 07 23 00 21 05`
        - ys-scalar-double: `20 07 41 22 46 04 40`
          - ys-scalar-json: `20 00 20 01 23 00 41 00 10 00 23 00 6a 24 00`
          - ys-scalar-json-check: `20 05 23 00 41 02 10 08 23 00 0f 0b`
        - ys-scalar-single: `20 07 41 27 46 04 40`
          - ys-single-end: `20 00 20 01 10 06 20 01 47 04 40 00 0b`
          - ys-single-open: `41 22 10 04 20 00 41 01 6a 21 00 20 01 41 01 6b 21 01`
          - ys-single-exit: `02 40`
            - ys-single-loop: `03 40`
              - ys-single-bound: `20 00 20 01 4f 0d 01`
              - ys-single-byte: `20 00 2d 00 00 21 07`
              - ys-single-apostrophe: `20 07 41 27 46 04 40 20 00 41 01 6a 20 01 4f 04 40 00 0b 20 00 2d 00 01 41 27 47 04 40 00 0b 20 00 41 01 6a 21 00 0b`
              - ys-single-write: `20 07 10 09 20 00 41 01 6a 21 00 0c 00 0b 0b`
          - ys-single-close: `41 22 10 04 20 05 23 00 41 01 10 08 23 00 0f 0b`
        - ys-scalar-flow: `20 07 41 fb00 46 20 07 41 db00 46 72 04 40`
          - ys-flow-key: `20 03 04 40 00 0b`
          - ys-flow-validate: `20 00 20 01 23 00 41 00 10 00 22 06 41 02 47 04 40 00 0b`
          - ys-flow-result: `23 00 20 06 6a 24 00 23 00 0f 0b`
        - ys-scalar-word: `20 00 20 01 10 0a 21 04`
        - ys-scalar-typed: `20 04 20 00 20 01 10 02 72 04 40`
          - ys-typed-key: `20 03 04 40 00 0b`
          - ys-typed-prefix: `41 3d 10 04 41 20 10 04`
          - ys-typed-word: `20 04 04 40 03 40 20 00 2d 00 00 41 20 72 10 04 20 00 41 01 6a 22 00 20 01 49 0d 00 0b`
            - ys-typed-number: `05 20 00 20 01 10 05 0b 23 00 0f 0b`
        - ys-plain-start: `20 07 41 20 72 41 e100 6b 41 19 4d 20 07 41 df00 46 72 20 07 41 8001 4f 72 45 04 40 00 0b`
        - ys-plain-open: `41 22 10 04`
        - ys-plain-loop: `03 40 20 00 2d 00 00 10 09 20 00 41 01 6a 22 00 20 01 49 0d 00 0b`
        - ys-plain-close: `41 22 10 04 20 05 23 00 41 01 10 08 23 00 0b`
    - ys-emit-record: `{{size:ys-emit-body}}`
      - ys-emit-body: `00 23 00 41 80800c 4f 04 40 00 0b 23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - ys-copy-record: `{{size:ys-copy-body}}`
      - ys-copy-body: `00 02 40 03 40 20 00 20 01 4f 0d 01 20 00 2d 00 00 10 04 20 00 41 01 6a 21 00 0c 00 0b 0b 0b`
    - ys-quoted-record: `{{size:ys-quoted-body}}`
      - ys-quoted-body: `01 02 7f`
        - ys-quoted-bound: `20 00 20 01 4f 20 01 41 808010 4b 72 04 40 00 0b`
        - ys-quoted-open: `20 00 2d 00 00 21 02 20 02 41 22 47 20 02 41 27 47 71 04 40 00 0b 20 00 41 01 6a 21 00`
        - ys-quoted-loop: `03 40`
          - ys-quoted-end: `20 00 20 01 4f 04 40 00 0b`
          - ys-quoted-byte: `20 00 2d 00 00 21 03`
          - ys-quoted-control: `20 03 41 20 49 20 03 41 09 47 71 04 40 00 0b`
          - ys-quoted-match: `20 03 20 02 46 04 40`
            - ys-quoted-double-single: `20 02 41 27 46 20 00 41 01 6a 20 01 49 71 04 40 20 00 2d 00 01 41 27 46 04 40 20 00 41 02 6a 21 00 0c 03 0b 0b`
            - ys-quoted-result: `20 00 41 01 6a 0f 0b`
          - ys-quoted-escape: `20 02 41 22 46 20 03 41 dc00 46 71 04 40 20 00 41 01 6a 21 00 0b`
          - ys-quoted-next: `20 00 41 01 6a 21 00 0c 00 0b 00 0b`
    - ys-analyze-record: `{{size:ys-analyze-body}}`
      - ys-analyze-body: `01 03 7f`
        - ys-analyze-bound: `20 00 20 01 4b 20 01 41 808010 4b 72 04 40 00 0b`
        - ys-analyze-empty: `20 00 20 01 46 04 40 20 01 41 00 0f 0b`
        - ys-analyze-byte: `20 00 2d 00 00 21 04`
        - ys-analyze-quoted: `20 04 41 22 46 20 04 41 27 46 72 04 40`
          - ys-analyze-quote-end: `20 00 20 01 10 06 22 02 20 01 10 0b 21 03`
          - ys-analyze-quote-done: `20 03 20 01 46 04 40 20 02 41 00 0f 0b`
          - ys-analyze-quote-comment: `20 03 20 02 4b 20 03 2d 00 00 41 23 46 71 04 40 20 02 41 00 0f 0b`
          - ys-analyze-quote-colon: `20 03 2d 00 00 41 3a 47 04 40 00 0b`
          - ys-analyze-quote-separation: `20 03 41 01 6a 20 01 49 04 40 20 03 2d 00 01 41 20 47 20 03 2d 00 01 41 09 47 71 04 40 00 0b 0b`
          - ys-analyze-quote-map: `20 01 20 03 41 01 6a 0f 0b`
        - ys-analyze-start: `20 00 21 02`
        - ys-analyze-exit: `02 40`
          - ys-analyze-loop: `03 40`
            - ys-analyze-end: `20 02 20 01 4f 0d 01`
            - ys-analyze-current: `20 02 2d 00 00 21 04`
            - ys-analyze-comment: `20 04 41 23 46 04 40`
              - ys-analyze-comment-first: `20 02 20 00 46 04 40 20 02 21 01 0c 02 0b`
              - ys-analyze-comment-space: `20 02 41 01 6b 2d 00 00 41 20 46 20 02 41 01 6b 2d 00 00 41 09 46 72 04 40 20 02 21 01 0c 02 0b 0b`
            - ys-analyze-colon: `20 04 41 3a 46 04 40`
              - ys-analyze-colon-last: `20 02 41 01 6a 20 01 46 04 40 20 01 20 02 41 01 6a 0f 0b`
              - ys-analyze-colon-space: `20 02 2d 00 01 41 20 46 20 02 2d 00 01 41 09 46 72 04 40 20 01 20 02 41 01 6a 0f 0b 0b`
            - ys-analyze-next: `20 02 41 01 6a 21 02 0c 00 0b 0b`
        - ys-analyze-trim-exit: `02 40`
          - ys-analyze-trim-loop: `03 40`
            - ys-analyze-trim-bound: `20 01 20 00 4d 0d 01`
            - ys-analyze-trim-byte: `20 01 41 01 6b 2d 00 00 21 04`
            - ys-analyze-trim-space: `20 04 41 20 46 20 04 41 09 46 72 45 0d 01`
            - ys-analyze-trim-next: `20 01 41 01 6b 21 01 0c 00 0b 0b`
        - ys-analyze-result: `20 01 41 00 0b`
    - ys-check-record: `{{size:ys-check-body}}`
      - ys-check-body: `01 05 7f`
        - ys-check-start: `20 00 41 01 6a 21 03 20 01 41 01 6b 21 01`
        - ys-check-loop: `03 40`
          - ys-check-unit: `20 03 21 07 20 03 20 01 20 04 10 01 21 04 21 03 21 05`
          - ys-check-end: `20 05 41 7f 46 04 40 0f 0b`
          - ys-check-raw: `20 02 41 01 46 20 07 2d 00 00 41 dc00 47 72 04 40 20 05 41 ff00 6b 41 20 4d 20 05 41 8501 47 71 20 05 41 feff03 4f 20 05 41 ffff03 4d 71 72 04 40 00 0b 0b`
          - ys-check-high: `20 05 41 80b003 6b 41 ff07 4d 04 40`
            - ys-check-low: `20 03 20 01 20 04 10 01 21 04 21 03 21 06`
            - ys-check-pair: `20 06 41 80b803 6b 41 ff07 4b 04 40 00 0b`
            - ys-check-lone: `05 20 05 41 80b803 6b 41 ff07 4d 04 40 00 0b 0b`
          - ys-check-next: `0c 00 0b 0b`
    - ys-byte-record: `{{size:ys-byte-body}}`
      - ys-byte-body: `00`
        - ys-byte-control: `20 00 41 20 49 20 00 41 09 47 71 04 40 00 0b`
        - ys-byte-tab: `20 00 41 09 46 04 40 41 dc00 10 04 41 f400 10 04 0f 0b`
        - ys-byte-escape: `20 00 41 22 46 20 00 41 dc00 46 72 04 40 41 dc00 10 04 0b`
        - ys-byte-write: `20 00 10 04 0b`
    - ys-word-record: `{{size:ys-word-body}}`
      - ys-word-body: `01 03 7f`
        - ys-word-four: `20 01 20 00 6b 41 04 46 04 40 20 00 28 00 00 41 a0c0808102 72 21 02 20 02 41 f4e4d5ab06 46 20 02 41 eeeab1e306 46 72 21 02 0b`
        - ys-word-five: `20 01 20 00 6b 41 05 46 04 40 20 00 28 00 00 41 a0c0808102 72 41 e6c2b19b07 46 20 00 2d 00 04 41 20 72 41 e500 46 71 21 02 0b`
        - ys-word-other: `20 02 45 04 40 41 00 0f 0b`
        - ys-word-case-start: `20 00 41 01 6a 21 03`
        - ys-word-case-loop: `03 40 20 04 20 03 2d 00 00 41 e100 4f 04 7f 41 01 05 41 02 0b 72 21 04 20 03 41 01 6a 22 03 20 01 49 0d 00 0b`
        - ys-word-case-result: `20 04 41 03 47 20 00 2d 00 00 41 e100 49 20 04 41 01 46 72 71 0b`
    - ys-trim-record: `{{size:ys-trim-body}}`
      - ys-trim-body: `00`
        - ys-trim-exit: `02 40`
          - ys-trim-loop: `03 40`
            - ys-trim-bound: `20 00 20 01 4f 0d 01`
            - ys-trim-space: `20 00 2d 00 00 41 20 46 20 00 2d 00 00 41 09 46 72 45 0d 01`
            - ys-trim-next: `20 00 41 01 6a 21 00 0c 00 0b 0b`
        - ys-trim-result: `20 00 0b`

Scalar locals: source start/end 0/1, destination 2, key flag 3, kind/colon 4,
string start 5, temporary length 6, byte 7. Analyze locals: start/end
0/1, cursor/quote end 2, post-quote cursor 3, byte 4. Unicode-check locals:
start/end 0/1, source kind 2 (1: generated quotes; 2: original JSON quotes),
cursor 3, pending 4, unit 5, low unit 6, previous cursor 7. Original JSON
escapes may encode controls; literal source bytes may not.
