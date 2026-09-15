# Fenced JSON array to JSON Lines

Validate a fenced JSON array and write each top-level element on its own line
inside a `jsonl` fence. Nested arrays and objects remain inside their record;
their internal commas do not create records. The JSON body is compacted, but
spaces and escapes inside strings, duplicate keys and number spellings remain
exactly as written.

```json
[
  {"name": "Ben", "tags": ["wasm", "Markdown"]},
  [1, 2],
  "comma, inside a string",
  null
]
```

becomes:

```jsonl
{"name":"Ben","tags":["wasm","Markdown"]}
[1,2]
"comma, inside a string"
null
```

An empty array produces an empty `jsonl` fence. A scalar or object root is
rejected: only array elements define records. Every output record ends with
LF. The [reverse conversion](14-json-lines-to-array.md) has the shared module
and its visible instruction lists. Its `array` export is re-exported here as
`run`, with the same memory and no additional function body or allocation.

Input is caller-supplied UTF-8, at most 64 KiB, with exactly a triple-backtick
`json` opening fence at byte zero and a matching closing fence on its own
line. LF and CRLF work; only JSON whitespace may follow the closing fence.
Output starts at `0x10000`, with a 128 KiB bound, and nesting is limited to
128 containers including the outer array. Invalid syntax, a different root
kind, or capacity overflow traps. A new call resets the state; callers must
retain previous output rather than publishing a failed call's partial buffer.

Instantiate the numeric scanner as `n`, the JSON parser using `n` as `p`, then
the JSON Lines module using `p` as `j`, then this adapter using `j`. These are
direct Wasm imports, not JavaScript implementations of the conversion. The
adapter's small byte size excludes all three dependencies and shared memory.

`[microwasm]`

- aj-header: `0061736d 01000000`
- aj-type-section: `01 {{size:aj-types}}`
  - aj-types: `01 60 01 7f 01 7f`
- aj-import-section: `02 {{size:aj-imports}}`
  - aj-imports: `02 01 6a 05 6172726179 00 00 01 6a 06 6d656d6f7279 02 01 04 04`
- aj-export-section: `07 {{size:aj-exports}}`
  - aj-exports: `02 03 72756e 00 00 06 6d656d6f7279 02 00`
