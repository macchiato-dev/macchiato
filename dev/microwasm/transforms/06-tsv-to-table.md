# Fenced TSV to a Markdown table

Read a `tsv` fence, using the first record as the header. Tabs separate fields;
LF or CRLF separate records. Every record must have the same number of fields.
Empty fields and significant spaces are retained. Quotes and commas are
ordinary data: there is no CSV-style quoting or backslash escape convention.
A tab or newline cannot be embedded inside a TSV field in this dialect.

```tsv
name	city
Ben	Phoenix
Ada	London
```

becomes:

```text
| name | city |
| --- | --- |
| Ben | Phoenix |
| Ada | London |
```

The fence starts at the beginning of input, uses at least three backticks,
and closes on its own line with the same number. Only whitespace may follow
it. At least one record is required; a blank record is a one-cell empty
header. A trailing record ending does not create another record.

## Shared row machinery, different field grammar

The [CSV-to-table module](04-csv-to-table.md) contains the implementation.
Its `tsv` entry selects the TSV grammar before starting the common row loop:
tabs become delimiters, and quotes never change the parser's state. The
Markdown cell escaping, width checks and header rule are shared unchanged.
This module directly re-exports that Wasm entry and its memory. No JavaScript
function performs or wraps the transformation.

See “Inside `convert`” in the [shared reader](04-csv-to-table.md) for its
field-state table. In TSV mode, only field-start and unquoted-field states
are reachable; a quote takes the ordinary-data path. “Inside `finish-row`”
on that page explains why an ending record separator does not manufacture
another row.

Both formats accept UTF-8 input up to 64 KiB and produce at most 128 KiB of
Markdown at `0x10000`. Unsupported controls, bare CR record endings, malformed
fences and mismatched widths trap. A new call resets state after a trap.

`[microwasm]`

- st-header: `0061736d 01000000`
- st-type-section: `01 {{size:st-types}}`
  - st-types: `01 60 01 7f 01 7f`
- st-import-section: `02 {{size:st-imports}}`
  - st-imports: `02 01 64 03 747376 00 00 01 64 06 6d656d6f7279 02 01 04 04`
- st-export-section: `07 {{size:st-exports}}`
  - st-exports: `02 03 72756e 00 00 06 6d656d6f7279 02 00`

Function 0 and memory 0 are imports from `d`, the actual CSV-to-table instance.
The small adapter's size does not include that dependency or its memory.
