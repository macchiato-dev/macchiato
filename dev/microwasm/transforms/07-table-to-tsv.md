# Markdown table to fenced TSV

Convert a rectangular Markdown pipe table to tab-separated records. The
header becomes the first record; the hyphen separator is omitted. Fields are
not quoted. Quotes, commas and backslashes in decoded data stay literal.

```text
| name | city |
| --- | --- |
| Ben | Phoenix |
| Ada | London |
```

becomes:

```tsv
name	city
Ben	Phoenix
Ada	London
```

Use decimal character references for significant edge spaces or literal
pipes, and backslash escapes for ASCII punctuation, as with the
[table-to-CSV tool](05-table-to-csv.md). Other inline Markdown stays literal
source text. The table starts with `|`, includes matching outer pipes on each
row, and has a separator of the same width. LF and CRLF are accepted.

## Reject data TSV cannot represent

After cell decoding, reject tabs, CR and LF inside a field. This includes
numeric references such as `&#9;` and `&#10;`, not just literal characters.
Do not silently turn them into separators or invent a backslash convention.
CSV can represent those fields; this TSV dialect cannot. Unsupported C0
controls are rejected as in the CSV tool.

The [shared implementation](05-table-to-csv.md) checks field bytes after
decoding, omits quote doubling and emits tabs between fields. Its `tsv` entry
sets the mode on every call. Fence selection remains collision-free even if
data contains backtick runs. There are no host parsing or formatting imports.

Input is at most 64 KiB of valid UTF-8. Output starts at `0x10000` with a
128 KiB cap. A trap discards the partial result; subsequent calls reset state.

`[microwasm]`

- ts-header: `0061736d 01000000`
- ts-type-section: `01 {{size:ts-types}}`
  - ts-types: `01 60 01 7f 01 7f`
- ts-import-section: `02 {{size:ts-imports}}`
  - ts-imports: `02 01 64 03 747376 00 00 01 64 06 6d656d6f7279 02 01 04 04`
- ts-export-section: `07 {{size:ts-exports}}`
  - ts-exports: `02 03 72756e 00 00 06 6d656d6f7279 02 00`

The imports come from `d`, the actual table-to-CSV module's exports. The
adapter re-exports the function and shared memory without allocating another
memory or adding a JavaScript callback. Its byte size excludes that dependency.
