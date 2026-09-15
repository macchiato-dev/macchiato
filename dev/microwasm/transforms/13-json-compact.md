# Compact fenced JSON without changing its data

Remove insignificant JSON whitespace while validating the entire document.
Whitespace inside strings is data and stays exactly as written. Duplicate
object keys and member order are retained, as are numeric spellings and
string escapes. This is not a canonicalizer or a JavaScript object round-trip.

```json
{
  "name": "Ben",
  "numbers": [ -0, 1.2300E+40 ],
  "text": "keep  these spaces"
}
```

becomes:

```json
{"name":"Ben","numbers":[-0,1.2300E+40],"text":"keep  these spaces"}
```

The same [shared parser](02-json-to-list.md) powers this tool and the
[pretty printer](12-json-pretty.md). Its compact mode emits container
punctuation but no indentation, line breaks, or spaces inside the JSON body.
Validated strings and scalars are copied directly from the input. A root
string, number, Boolean or null is just as valid as an object or array.

Input is caller-supplied UTF-8 in a triple-backtick `json` fence, at most
64 KiB. Fences occupy their own lines, using LF or CRLF; surrounding JSON
whitespace is permitted. The output uses a triple-backtick `json` fence,
with a single body line and LF endings. Its buffer starts at `0x10000` and
has a 128 KiB limit. Nesting is limited to 128 containers. Invalid syntax or
capacity traps without affecting the next call. Publish only successful
output, not the partial buffer left by a failed parse.

## Direct Wasm entry, not a JavaScript wrapper

Instantiate the number scanner as `n`, then the shared parser with `n`, then
this adapter with the parser as `p`. It re-exports `p.compact` as `run` and
the same four-page memory; no function body or host conversion is hidden here.
The adapter's size does not include the parser or scanner dependency.

`[microwasm]`

- jc-header: `0061736d 01000000`
- jc-type-section: `01 {{size:jc-types}}`
  - jc-types: `01 60 01 7f 01 7f`
- jc-import-section: `02 {{size:jc-imports}}`
  - jc-imports: `02 01 70 07 636f6d70616374 00 00 01 70 06 6d656d6f7279 02 01 04 04`
- jc-export-section: `07 {{size:jc-exports}}`
  - jc-exports: `02 03 72756e 00 00 06 6d656d6f7279 02 00`
