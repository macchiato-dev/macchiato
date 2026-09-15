# Hierarchical Markdown data to TOML

Tool 18 converts the hierarchical data list into a `toml` fenced block.
The root must be `{}`. Each root property becomes a key/value line; nested
objects become inline tables, and arrays may contain values of different
types, including arrays and inline tables. Empty tables and arrays survive.

```text
- {}
  - name Ben
  - active = true
  - location {}
    - city Phoenix
  - tags []
    - wasm
    - Markdown
  - empty {}
```

becomes:

```toml
"name" = "Ben"
"active" = true
"location" = {"city" = "Phoenix"}
"tags" = ["wasm", "Markdown"]
"empty" = {}
```

## Preserve values, not syntax coincidences

The output targets [TOML 1.0](https://toml.io/en/v1.0.0), using syntax that
also works in newer TOML versions. Keys are always quoted, so a dot remains
part of a name instead of creating a table path. Strings resembling dates,
Booleans, or numbers remain strings. Tables require unique decoded keys at
every level, including tables inside arrays. Null has no TOML representation
and traps rather than being omitted or changed to an empty string.

JSON-shaped numeric tokens retain their spelling. Tokens without a decimal
point or exponent must fit signed 64-bit integers, including the asymmetric
negative endpoint. Decimal/exponent tokens are emitted as floats without
conversion to a host number. Consumer floating-point rounding and range
handling still apply; this writer does not promise arbitrary-precision TOML
floats. Dates and times are not synthesized from strings.

The Unicode writer follows the same pattern as the YAML writer: decode JSON
escapes, combine surrogate pairs, reject lone surrogates, then emit quoted
UTF-8 with Unicode escapes for controls. In particular, JSON's escaped slash
becomes an ordinary slash, not the unsupported TOML `\/` escape. JSON
surrogate-pair escapes become a Unicode scalar, not two invalid TOML escapes.

## Pattern: one validated source, two collection separators

The list compiler validates the tree and writes compact JSON. Copy its body
to the final memory page, then descend over its spans. The root table emits
newlines between assignments. Every nested collection uses commas and spaces;
an object additionally writes its quoted keys and equals signs. This avoids
building a second tree or retaining a table-path stack.

```text
compile the list to compact JSON; require an object root
copy the JSON body to scratch
value(depth):
  scalar string: decode and quote as TOML
  other scalar: reject null, check integer range, copy its exact spelling
  collection:
    emit opening delimiter unless this is the root
    for each child:
      object: reject duplicate keys; emit quoted key and ' = '
      value(depth + 1)
      root: emit newline; nested: emit ', ' between children
    emit closing delimiter unless this is the root
```

Duplicate-key checks rescan earlier members of the same object using the
shared decoded-string comparator. This takes quadratic time for very wide
objects, but no key table or heap. The scanner skips nested values and quoted
delimiters; it only reads JSON already validated by the list compiler.

Input is limited to 64 KiB, compact intermediate JSON to 64 KiB, output to
128 KiB, and nesting to 128 collections. The fixed four-page memory preserves
the original input. Scratch replaces the list compiler's now-unused stack;
each new run rebuilds it. Output stores are checked before writing. A trap
must not publish partial output, and the same instances can be reused after
failure. Do not use these shared instances concurrently.

## Module

Imports: list-run 0 from `l`, equal 1 and next-unit 2 from `k`, and `l.memory`.
Defined functions: run 3, emit 4, number-check 5, copy 6, scan 7, string 8,
UTF-8 scalar 9, value 10, four hex digits 11. Globals: output 0, source cursor
1, source end 2. The scan/string/UTF-8/hex patterns are deliberately the same
as the YAML writer, with visible bytes here rather than hidden includes.

`[microwasm]`

- lt-header: `0061736d 01000000`
- lt-type-section: `01 {{size:lt-types}}`
  - lt-types: `05 60 01 7f 01 7f 60 04 7f 7f 7f 7f 01 7f 60 03 7f 7f 7f 03 7f 7f 7f 60 01 7f 00 60 02 7f 7f 00`
- lt-import-section: `02 {{size:lt-imports}}`
  - lt-imports: `04 01 6c 03 72756e 00 00 01 6b 05 657175616c 00 01 01 6b 04 6e657874 00 02 01 6c 06 6d656d6f7279 02 01 04 04`
- lt-function-section: `03 {{size:lt-functions}}`
  - lt-functions: `09 00 03 03 04 00 04 03 03 03`
- lt-global-section: `06 {{size:lt-globals}}`
  - lt-globals: `03 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b`
- lt-export-section: `07 {{size:lt-exports}}`
  - lt-exports: `02 03 72756e 00 03 06 6d656d6f7279 02 00`
- lt-code-section: `0a {{size:lt-code}}`
  - lt-code: `09`
    - lt-run-record: `{{size:lt-run-body}}`
      - lt-run-body: `01 01 7f`
        - lt-compile: `20 00 10 00 41 0d 6b 21 01`
        - lt-source-bound: `20 01 45 20 01 41 808004 4b 72 04 40 00 0b`
        - lt-source-copy: `41 80800c 41 888004 20 01 fc 0a 00 00`
        - lt-reset: `41 808004 24 00 41 80800c 24 01 41 80800c 20 01 6a 24 02`
        - lt-root-kind: `23 01 2d 00 00 41 fb00 47 04 40 00 0b`
        - lt-fence: `41 e000 10 04 41 e000 10 04 41 e000 10 04 41 f400 10 04 41 ef00 10 04 41 ed00 10 04 41 ec00 10 04 41 0a 10 04`
        - lt-root: `41 00 10 0a 23 01 23 02 47 04 40 00 0b`
        - lt-close: `41 e000 10 04 41 e000 10 04 41 e000 10 04 41 0a 10 04 23 00 41 808004 6b 0b`
    - lt-emit-record: `{{size:lt-emit-body}}`
      - lt-emit-body: `00 23 00 41 80800c 4f 04 40 00 0b 23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - lt-number-record: `{{size:lt-number-body}}`
      - lt-number-body: `02 03 7f 01 7e`
        - lt-number-start: `23 01 21 01 23 01 2d 00 00 21 03`
        - lt-number-null: `20 03 41 ee00 46 04 40 00 0b`
        - lt-number-boolean: `20 03 41 f400 46 20 03 41 e600 46 72 04 40 0f 0b`
        - lt-number-scan: `03 40 20 01 2d 00 00 21 03 20 03 41 2e 46 20 03 41 20 72 41 e500 46 72 04 40 0f 0b 20 01 41 01 6a 22 01 20 00 49 0d 00 0b`
        - lt-number-sign: `23 01 2d 00 00 41 2d 46 21 02 23 01 20 02 6a 21 01`
        - lt-number-digits: `03 40`
          - lt-number-multiply-bound: `20 04 42 cc99b3e6cc99b3e60c 56 04 40 00 0b`
          - lt-number-accumulate: `20 04 42 0a 7e 20 01 2d 00 00 41 30 6b ad 7c 21 04`
          - lt-number-next: `20 01 41 01 6a 22 01 20 00 49 0d 00 0b`
        - lt-number-final-bound: `20 04 42 ffffffffffffffffff00 20 02 ad 7c 56 04 40 00 0b 0b`
    - lt-copy-record: `{{size:lt-copy-body}}`
      - lt-copy-body: `00`
        - lt-copy-exit: `02 40`
          - lt-copy-loop: `03 40`
            - lt-copy-bound: `20 00 20 01 4f 0d 01`
            - lt-copy-byte: `20 00 2d 00 00 10 04`
            - lt-copy-next: `20 00 41 01 6a 21 00 0c 00 0b 0b 0b`
    - lt-scan-record: `{{size:lt-scan-body}}`
      - lt-scan-body: `01 03 7f`
        - lt-scan-exit: `02 40`
          - lt-scan-loop: `03 40`
            - lt-scan-bound: `20 00 23 02 4f 0d 01`
            - lt-scan-byte: `20 00 2d 00 00 21 03`
            - lt-scan-string: `20 02 04 40`
              - lt-scan-escape: `20 03 41 dc00 46 04 40 20 00 41 01 6a 21 00`
                - lt-scan-string-close: `05 20 03 41 22 46 04 40 41 00 21 02 0b 0b`
              - lt-scan-outside: `05 20 03 41 22 46 04 40 41 01 21 02`
                - lt-scan-structure: `05`
                - lt-scan-stop: `20 01 45 20 03 41 2c 46 20 03 41 3a 46 72 20 03 41 dd00 46 72 20 03 41 fd00 46 72 71 0d 03`
                - lt-scan-open: `20 03 41 db00 46 20 03 41 fb00 46 72 04 40 20 01 41 01 6a 21 01 0b`
                - lt-scan-close: `20 03 41 dd00 46 20 03 41 fd00 46 72 04 40 20 01 41 01 6b 21 01 0b 0b 0b`
            - lt-scan-next: `20 00 41 01 6a 21 00 0c 00 0b 0b`
        - lt-scan-result: `20 00 0b`
    - lt-string-record: `{{size:lt-string-body}}`
      - lt-string-body: `01 03 7f`
        - lt-string-open: `41 22 10 04 20 00 41 01 6a 21 00 20 01 41 01 6b 21 01`
        - lt-string-exit: `02 40`
          - lt-string-loop: `03 40`
            - lt-string-unit: `20 00 20 01 20 02 10 02 21 02 21 00 21 03`
            - lt-string-end: `20 03 41 7f 46 0d 01`
            - lt-string-high: `20 03 41 80b003 6b 41 ff07 4d 04 40`
              - lt-string-low: `20 00 20 01 20 02 10 02 21 02 21 00 21 04`
              - lt-string-low-check: `20 04 41 80b803 6b 41 ff07 4b 04 40 00 0b`
              - lt-string-pair: `20 03 41 80b003 6b 41 0a 74 20 04 41 80b803 6b 6a 41 808004 6a 21 03`
              - lt-string-lone-low: `05 20 03 41 80b803 6b 41 ff07 4d 04 40 00 0b 0b`
            - lt-string-slash: `20 03 41 22 46 20 03 41 dc00 46 72 04 40 41 dc00 10 04 0b`
            - lt-string-control: `20 03 41 20 49 20 03 41 ff00 6b 41 20 4d 72 20 03 41 a8c000 6b 41 01 4d 72 20 03 41 feff03 4f 20 03 41 ffff03 4d 71 72 04 40`
              - lt-string-escaped: `41 dc00 10 04 41 f500 10 04 20 03 10 0b`
              - lt-string-scalar: `05 20 03 10 09 0b`
            - lt-string-next: `0c 00 0b 0b`
        - lt-string-close: `41 22 10 04 0b`
    - lt-utf8-record: `{{size:lt-utf8-body}}`
      - lt-utf8-body: `00`
        - lt-utf8-ascii: `20 00 41 8001 49 04 40 20 00 10 04 0f 0b`
        - lt-utf8-two: `20 00 41 8010 49 04 40 20 00 41 06 76 41 c001 72 10 04`
          - lt-utf8-more: `05 20 00 41 808004 49 04 40 20 00 41 0c 76 41 e001 72 10 04`
            - lt-utf8-four: `05 20 00 41 12 76 41 f001 72 10 04 20 00 41 0c 76 41 3f 71 41 8001 72 10 04 0b`
          - lt-utf8-middle: `20 00 41 06 76 41 3f 71 41 8001 72 10 04 0b`
        - lt-utf8-last: `20 00 41 3f 71 41 8001 72 10 04 0b`
    - lt-value-record: `{{size:lt-value-body}}`
      - lt-value-body: `01 07 7f`
        - lt-value-peek: `23 01 2d 00 00 21 01`
        - lt-value-container: `20 01 41 fb00 46 20 01 41 db00 46 72 04 40`
          - lt-value-depth: `20 00 41 8001 4f 04 40 00 0b`
          - lt-value-open: `20 01 41 02 6a 21 02 23 01 41 01 6a 24 01 20 00 04 40 20 01 10 04 0b`
          - lt-value-empty: `23 01 2d 00 00 20 02 46 04 40 20 00 04 40 20 02 10 04 0b 23 01 41 01 6a 24 01 0f 0b`
          - lt-map-start: `23 01 21 05`
          - lt-child-loop: `03 40`
            - lt-child-map: `20 01 41 fb00 46 04 40`
              - lt-key-span: `23 01 21 03 23 01 10 07 21 04 20 05 21 06`
              - lt-key-exit: `02 40`
                - lt-key-loop: `03 40`
                  - lt-key-bound: `20 06 20 03 4f 0d 01`
                  - lt-key-previous: `20 06 10 07 21 07`
                  - lt-key-duplicate: `20 03 20 04 20 06 20 07 10 01 04 40 00 0b`
                  - lt-key-next: `20 07 41 01 6a 10 07 41 01 6a 21 06 0c 00 0b 0b`
              - lt-key-output: `20 03 20 04 10 08 41 20 10 04 41 3d 10 04 41 20 10 04 20 04 41 01 6a 24 01 0b`
            - lt-child-value: `20 00 41 01 6a 10 0a`
            - lt-child-root-line: `20 00 45 04 40 41 0a 10 04 0b`
            - lt-child-close: `23 01 2d 00 00 20 02 46 04 40 20 00 04 40 20 02 10 04 0b 23 01 41 01 6a 24 01 0f 0b`
            - lt-child-separator: `20 00 04 40 41 2c 10 04 41 20 10 04 0b`
            - lt-child-next: `23 01 41 01 6a 24 01 0c 00 0b 0b`
        - lt-scalar-end: `23 01 10 07 21 03`
        - lt-scalar-string: `20 01 41 22 46 04 40 23 01 20 03 10 08`
          - lt-scalar-copy: `05 20 03 10 05 23 01 20 03 10 06 0b`
        - lt-scalar-finish: `20 03 24 01 0b`
    - lt-hex-record: `{{size:lt-hex-body}}`
      - lt-hex-body: `01 02 7f`
        - lt-hex-start: `41 0c 21 01`
        - lt-hex-exit: `02 40`
          - lt-hex-loop: `03 40`
            - lt-hex-digit: `20 00 20 01 76 41 0f 71 21 02`
            - lt-hex-output: `20 02 20 02 41 0a 49 04 7f 41 30 05 41 d700 0b 6a 10 04`
            - lt-hex-done: `20 01 45 0d 01`
            - lt-hex-next: `20 01 41 04 6b 21 01 0c 00 0b 0b 0b`

Number-check locals: source end 0, cursor 1, negative flag 2, byte 3,
unsigned magnitude 4 (i64). Accumulation checks the bound before multiplying
by ten and then checks the final magnitude against `2^63 - 1 + negative`.
Scan locals: cursor 0, nesting 1, string flag 2, byte 3. String locals:
cursor/end 0/1, pending 2, unit 3, low surrogate 4. Value locals: depth 0,
opening byte 1, closing byte 2, current key start/end 3/4, mapping start 5,
prior key start/end 6/7. Recursion retains small frames, not a data tree.
