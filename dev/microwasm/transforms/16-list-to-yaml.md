# Hierarchical Markdown data to block YAML

Convert the [hierarchical data notation](01-list-to-json.md) to a `yaml`
fence containing block mappings and sequences. Strings and keys are always
double-quoted; typed `= ` values remain JSON booleans, nulls or numbers.
This avoids YAML's implicit typing changing strings such as `"false"`,
`"2026-09-15"`, or `"0123"` into other values.

```text
- {}
  - name Ben
  - active = true
  - location {}
    - city Phoenix
  - tags []
    - wasm
    - yaml
  - empty {}
```

becomes:

```yaml
"name": "Ben"
"active": true
"location":
  "city": "Phoenix"
"tags":
  - "wasm"
  - "yaml"
"empty": {}
```

Nonempty containers use two-space block indentation; empty containers stay
`{}` or `[]`. Scalar roots work too. Numbers retain their exact spelling,
without binary64 conversion. A YAML consumer's numeric representation can
still round large numbers; this tool only emits their text.

## YAML boundaries that differ from JSON

[YAML 1.2.2](https://yaml.org/spec/1.2.2/) requires unique mapping keys.
Every mapping is checked, including nested mappings. Decoded-equivalent
spellings such as `"x"` and `"\u0078"` are duplicates. Names remain
case-sensitive and are not Unicode-normalized. This is stricter than the
JSON-list converter, which preserves duplicates as text.

Strings are decoded into code units with the shared Wasm iterator, then
written as quoted UTF-8. Valid surrogate pairs become their Unicode scalar;
unpaired surrogates trap rather than emitting nonportable string data. Quotes
and backslashes are escaped. Controls, DEL/C1, U+2028/U+2029, and U+FFFE/U+FFFF
use four-digit Unicode escapes. This changes spelling, not the string value.
The test-only Deno standard-library YAML parser checks the emitted YAML under
its JSON schema. Neither it nor any host parser is shipped with the tool.

Implicit YAML keys have a length restriction. When a rendered key occupies
1,024 or more UTF-8 bytes, use the explicit form instead:

```yaml
? "a long key goes here"
: "value"
```

Counting bytes is conservative for non-ASCII names, and explicit keys are
valid for short names too. No key is truncated. Tags, anchors, aliases and
comments are not synthesized from the input: strings containing their syntax
remain quoted data.

## Pattern: validated spans and a streaming emitter

The existing list-to-JSON module validates the Markdown tree and creates
compact JSON. Copy its body once into the final memory page, then recursively
scan that validated source while emitting YAML. No host conversion and no
object tree are involved. Before emitting a mapping key, scan earlier keys in
that same mapping and compare decoded strings. Nested values are skipped by
their structural boundaries. This is quadratic for wide mappings, but needs
no retained key table or extra allocations.

```text
compile the Markdown tree to JSON and copy its body to scratch
value(depth):
    if scalar: emit a separating space when nested, then the value and LF
    if empty container: emit its flow marker and LF
    otherwise:
        start a new line when nested
        for each child:
            indent; emit a unique quoted key and ':' or a sequence '-'
            value(depth + 1)
```

The fixed four-page memory holds original input in the first page, output
in the middle two pages, and scratch in the last page. Input is at most
64 KiB; output is at most 128 KiB; the intermediate compact JSON body must
fit 64 KiB. Quoting expansion can exceed this intermediate limit even when
the Markdown input fits. The list compiler's stack in the last page is no
longer needed when scratch replaces it. Each run rebuilds that stack. The
original input remains unchanged. Nesting is limited to 128 containers.
On any error or capacity overflow, trap and publish no partial result; a
subsequent call can reuse the instances. Do not share this memory concurrently.

## Module

Instantiate the number scanner as `n`, list-to-JSON as `l`, and string-key
helpers as `k`, all sharing the same memory. Imports: list-run 0, key-equal 1,
next-unit 2. Defined functions: run 3, emit 4, indent 5, copy 6, scan 7,
string 8, UTF-8 scalar 9, value 10, four hex digits 11. Globals: output 0,
source cursor 1, source end 2. Only `run` and `memory` are exported.

`[microwasm]`

- ly-header: `0061736d 01000000`
- ly-type-section: `01 {{size:ly-types}}`
  - ly-types: `05 60 01 7f 01 7f 60 04 7f 7f 7f 7f 01 7f 60 03 7f 7f 7f 03 7f 7f 7f 60 01 7f 00 60 02 7f 7f 00`
- ly-import-section: `02 {{size:ly-imports}}`
  - ly-imports: `04 01 6c 03 72756e 00 00 01 6b 05 657175616c 00 01 01 6b 04 6e657874 00 02 01 6c 06 6d656d6f7279 02 01 04 04`
- ly-function-section: `03 {{size:ly-functions}}`
  - ly-functions: `09 00 03 03 04 00 04 03 03 03`
- ly-global-section: `06 {{size:ly-globals}}`
  - ly-globals: `03 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b`
- ly-export-section: `07 {{size:ly-exports}}`
  - ly-exports: `02 03 72756e 00 03 06 6d656d6f7279 02 00`
- ly-code-section: `0a {{size:ly-code}}`
  - ly-code: `09`
    - ly-run-record: `{{size:ly-run-body}}`
      - ly-run-body: `01 01 7f`
        - ly-compile: `20 00 10 00 41 0d 6b 21 01`
        - ly-source-bound: `20 01 45 20 01 41 808004 4b 72 04 40 00 0b`
        - ly-source-copy: `41 80800c 41 888004 20 01 fc 0a 00 00`
        - ly-reset: `41 808004 24 00 41 80800c 24 01 41 80800c 20 01 6a 24 02`
        - ly-fence: `41 e000 10 04 41 e000 10 04 41 e000 10 04 41 f900 10 04 41 e100 10 04 41 ed00 10 04 41 ec00 10 04 41 0a 10 04`
        - ly-root: `41 00 10 0a 23 01 23 02 47 04 40 00 0b`
        - ly-close: `41 e000 10 04 41 e000 10 04 41 e000 10 04 41 0a 10 04 23 00 41 808004 6b 0b`
    - ly-emit-record: `{{size:ly-emit-body}}`
      - ly-emit-body: `00 23 00 41 80800c 4f 04 40 00 0b 23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - ly-indent-record: `{{size:ly-indent-body}}`
      - ly-indent-body: `00`
        - ly-indent-exit: `02 40`
          - ly-indent-loop: `03 40`
            - ly-indent-bound: `20 00 45 0d 01`
            - ly-indent-spaces: `41 20 10 04 41 20 10 04`
            - ly-indent-next: `20 00 41 01 6b 21 00 0c 00 0b 0b 0b`
    - ly-copy-record: `{{size:ly-copy-body}}`
      - ly-copy-body: `00`
        - ly-copy-exit: `02 40`
          - ly-copy-loop: `03 40`
            - ly-copy-bound: `20 00 20 01 4f 0d 01`
            - ly-copy-byte: `20 00 2d 00 00 10 04`
            - ly-copy-next: `20 00 41 01 6a 21 00 0c 00 0b 0b 0b`
    - ly-scan-record: `{{size:ly-scan-body}}`
      - ly-scan-body: `01 03 7f`
        - ly-scan-exit: `02 40`
          - ly-scan-loop: `03 40`
            - ly-scan-bound: `20 00 23 02 4f 0d 01`
            - ly-scan-byte: `20 00 2d 00 00 21 03`
            - ly-scan-string: `20 02 04 40`
              - ly-scan-escape: `20 03 41 dc00 46 04 40 20 00 41 01 6a 21 00`
                - ly-scan-string-close: `05 20 03 41 22 46 04 40 41 00 21 02 0b 0b`
              - ly-scan-outside: `05 20 03 41 22 46 04 40 41 01 21 02`
                - ly-scan-structure: `05`
                - ly-scan-stop: `20 01 45 20 03 41 2c 46 20 03 41 3a 46 72 20 03 41 dd00 46 72 20 03 41 fd00 46 72 71 0d 03`
                - ly-scan-open: `20 03 41 db00 46 20 03 41 fb00 46 72 04 40 20 01 41 01 6a 21 01 0b`
                - ly-scan-close: `20 03 41 dd00 46 20 03 41 fd00 46 72 04 40 20 01 41 01 6b 21 01 0b 0b 0b`
            - ly-scan-next: `20 00 41 01 6a 21 00 0c 00 0b 0b`
        - ly-scan-result: `20 00 0b`
    - ly-string-record: `{{size:ly-string-body}}`
      - ly-string-body: `01 03 7f`
        - ly-string-open: `41 22 10 04 20 00 41 01 6a 21 00 20 01 41 01 6b 21 01`
        - ly-string-exit: `02 40`
          - ly-string-loop: `03 40`
            - ly-string-unit: `20 00 20 01 20 02 10 02 21 02 21 00 21 03`
            - ly-string-end: `20 03 41 7f 46 0d 01`
            - ly-string-high: `20 03 41 80b003 6b 41 ff07 4d 04 40`
              - ly-string-low: `20 00 20 01 20 02 10 02 21 02 21 00 21 04`
              - ly-string-low-check: `20 04 41 80b803 6b 41 ff07 4b 04 40 00 0b`
              - ly-string-pair: `20 03 41 80b003 6b 41 0a 74 20 04 41 80b803 6b 6a 41 808004 6a 21 03`
              - ly-string-lone-low: `05 20 03 41 80b803 6b 41 ff07 4d 04 40 00 0b 0b`
            - ly-string-slash: `20 03 41 22 46 20 03 41 dc00 46 72 04 40 41 dc00 10 04 0b`
            - ly-string-control: `20 03 41 20 49 20 03 41 ff00 6b 41 20 4d 72 20 03 41 a8c000 6b 41 01 4d 72 20 03 41 feff03 4f 20 03 41 ffff03 4d 71 72 04 40`
              - ly-string-escaped: `41 dc00 10 04 41 f500 10 04 20 03 10 0b`
              - ly-string-scalar: `05 20 03 10 09 0b`
            - ly-string-next: `0c 00 0b 0b`
        - ly-string-close: `41 22 10 04 0b`
    - ly-utf8-record: `{{size:ly-utf8-body}}`
      - ly-utf8-body: `00`
        - ly-utf8-ascii: `20 00 41 8001 49 04 40 20 00 10 04 0f 0b`
        - ly-utf8-two: `20 00 41 8010 49 04 40 20 00 41 06 76 41 c001 72 10 04`
          - ly-utf8-more: `05 20 00 41 808004 49 04 40 20 00 41 0c 76 41 e001 72 10 04`
            - ly-utf8-four: `05 20 00 41 12 76 41 f001 72 10 04 20 00 41 0c 76 41 3f 71 41 8001 72 10 04 0b`
          - ly-utf8-middle: `20 00 41 06 76 41 3f 71 41 8001 72 10 04 0b`
        - ly-utf8-last: `20 00 41 3f 71 41 8001 72 10 04 0b`
    - ly-value-record: `{{size:ly-value-body}}`
      - ly-value-body: `01 08 7f`
        - ly-value-peek: `23 01 2d 00 00 21 01`
        - ly-value-container: `20 01 41 fb00 46 20 01 41 db00 46 72 04 40`
          - ly-value-depth: `20 00 41 8001 4f 04 40 00 0b`
          - ly-value-open: `20 01 41 02 6a 21 02 23 01 41 01 6a 24 01`
          - ly-value-empty: `23 01 2d 00 00 20 02 46 04 40`
            - ly-value-empty-space: `20 00 04 40 41 20 10 04 0b`
            - ly-value-empty-marker: `20 01 10 04 20 02 10 04 41 0a 10 04 23 01 41 01 6a 24 01 0f 0b`
          - ly-value-newline: `20 00 04 40 41 0a 10 04 0b`
          - ly-map-start: `23 01 21 05`
          - ly-child-loop: `03 40`
            - ly-child-indent: `20 00 10 05`
            - ly-child-map: `20 01 41 fb00 46 04 40`
              - ly-key-span: `23 01 21 03 23 01 10 07 21 04 20 05 21 06`
              - ly-key-exit: `02 40`
                - ly-key-loop: `03 40`
                  - ly-key-bound: `20 06 20 03 4f 0d 01`
                  - ly-key-previous: `20 06 10 07 21 07`
                  - ly-key-duplicate: `20 03 20 04 20 06 20 07 10 01 04 40 00 0b`
                  - ly-key-next: `20 07 41 01 6a 10 07 41 01 6a 21 06 0c 00 0b 0b`
              - ly-key-output: `23 00 21 08 20 03 20 04 10 08`
              - ly-key-long: `23 00 20 08 6b 41 8008 4f 04 40`
                - ly-key-room: `23 00 41 02 6a 41 80800c 4b 04 40 00 0b`
                - ly-key-shift: `20 08 41 02 6a 20 08 23 00 20 08 6b fc 0a 00 00`
                - ly-key-explicit: `20 08 41 3f 3a 00 00 20 08 41 20 3a 00 01 23 00 41 02 6a 24 00`
                - ly-key-line: `41 0a 10 04 20 00 10 05 0b`
              - ly-key-colon: `41 3a 10 04 20 04 41 01 6a 24 01`
              - ly-child-sequence: `05 41 2d 10 04 0b`
            - ly-child-value: `20 00 41 01 6a 10 0a`
            - ly-child-close: `23 01 2d 00 00 20 02 46 04 40 23 01 41 01 6a 24 01 0f 0b`
            - ly-child-next: `23 01 41 01 6a 24 01 0c 00 0b 0b`
        - ly-scalar-space: `20 00 04 40 41 20 10 04 0b`
        - ly-scalar-end: `23 01 10 07 21 03`
        - ly-scalar-string: `20 01 41 22 46 04 40 23 01 20 03 10 08`
          - ly-scalar-copy: `05 23 01 20 03 10 06 0b`
        - ly-scalar-finish: `20 03 24 01 41 0a 10 04 0b`
    - ly-hex-record: `{{size:ly-hex-body}}`
      - ly-hex-body: `01 02 7f`
        - ly-hex-start: `41 0c 21 01`
        - ly-hex-exit: `02 40`
          - ly-hex-loop: `03 40`
            - ly-hex-digit: `20 00 20 01 76 41 0f 71 21 02`
            - ly-hex-output: `20 02 20 02 41 0a 49 04 7f 41 30 05 41 d700 0b 6a 10 04`
            - ly-hex-done: `20 01 45 0d 01`
            - ly-hex-next: `20 01 41 04 6b 21 01 0c 00 0b 0b 0b`

Scan locals: cursor 0, nesting 1, string flag 2, byte 3. String locals:
cursor/end 0/1, pending 2, unit 3, low surrogate 4. Value locals: depth 0,
opening byte 1, closing byte 2, current key start/end 3/4, mapping start 5,
prior key start/end 6/7, output key start 8. Recursion retains these small
frames, not a materialized data tree.
