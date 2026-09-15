# Pretty-print fenced JSON

Validate one fenced JSON value and write it with two spaces per nesting level.
Nonempty objects and arrays put each member on its own line. Empty containers
stay `{}` and `[]`. There is one space after each object colon and no trailing
commas. A scalar root is valid too.

```json
{"name":"Ben","tags":["wasm","Markdown"],"settings":{}}
```

becomes:

```json
{
  "name": "Ben",
  "tags": [
    "wasm",
    "Markdown"
  ],
  "settings": {}
}
```

Only insignificant JSON whitespace changes. Duplicate keys stay in their
original order; `-0`, `1.2300E+40`, and arbitrarily large numeric lexemes are
not converted to machine numbers. String escapes retain their original
spelling, including escaped surrogate code units. There is no JavaScript
`JSON.parse`/`JSON.stringify` step and no intermediate object tree.

Input is UTF-8 supplied by the caller, at most 64 KiB, in a triple-backtick
`json` fence. Opening and closing fences must occupy their own lines. LF and
CRLF work; surrounding JSON whitespace is allowed. Output is a triple-backtick
`json` fence with LF endings, at `0x10000`, at most 128 KiB. At most 128 nested
containers are accepted. Malformed syntax, deeper nesting, or capacity overflow
traps; a subsequent call starts cleanly. Do not publish partial output.

## Pattern: one descent, several output forms

The [JSON-to-list module](02-json-to-list.md) owns the shared descent and its
`pretty` entry. It validates and copies each scalar/string span once, adding
only structural indentation and punctuation as it traverses containers.
This adapter directly exports that Wasm function as `run`; it has no code
section and no host callback. Instantiate the number scanner as `n`, the
shared parser using `n`, then this adapter with that parser as `p`.

The adapter's byte size excludes both dependencies. All three share the
number scanner's four-page memory. The parser's list, pretty and compact
entries explicitly select their own mode, including after a failed call.

`[microwasm]`

- jp-header: `0061736d 01000000`
- jp-type-section: `01 {{size:jp-types}}`
  - jp-types: `01 60 01 7f 01 7f`
- jp-import-section: `02 {{size:jp-imports}}`
  - jp-imports: `02 01 70 06 707265747479 00 00 01 70 06 6d656d6f7279 02 01 04 04`
- jp-export-section: `07 {{size:jp-exports}}`
  - jp-exports: `02 03 72756e 00 00 06 6d656d6f7279 02 00`
