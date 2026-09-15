# Markdown transformation tools

This is the implementation checklist for the current goal, not a claim that
all of these tools are already available. The transforms execute handwritten
Microwasm. Browser JavaScript copies input/output and handles the UI; it does
not substitute JavaScript implementations of the conversions.

Current checkpoint: unsigned 64-bit radix primitives, strict JSON-number
syntax validation and binary64 parsing, tools 1–25, and the side-by-side
editor are implemented and tested. Exact binary64 decimal expansion is also
implemented as a formatting primitive, with shortest finite decimal output
built on it. `parseInt`-style radix parsing and `parseFloat`-style decimal
prefix parsing are also implemented, as is shortest binary64 formatting in
every radix 2..36 and whole-string numeric conversion. Fixed, exponential and
significant-digit formatting are implemented too. The other 25 tools remain.
This is not goal completion.

Tools 12–15 reuse the JSON descent already needed by tool 2, so they were
implemented before the JSON-table group. They preserve duplicate keys, exact
number lexemes and string escapes. The numbering below remains the plan's
stable numbering; tools 1–25 are now all implemented.
The JSON-table group now has tools 10–11: rectangular arrays of rows become
a table whose cells are explicitly JSON values, and the reverse converter
validates each decoded cell separately. The first row is the header.
Tool 8 now collects the ordered header union from JSON objects, comparing
escaped names by their decoded value and distinguishing missing fields from
null. Tool 9 reverses that representation, rejecting semantically duplicate
headers and validating each cell independently before emitting a property.
Tool 16 emits block YAML from hierarchical data, preserving types through
quoted strings, checking mapping uniqueness and using explicit long keys.
Tool 17 reads that block representation, with plain and single-quoted text,
comments and implicit nulls as well. A separate scalar module shares the Wasm
JSON and Unicode routines. Both directions validate duplicate decoded keys.
This completes the pair for the documented block-data subset, not full YAML.
Tool 18 emits TOML assignments with inline nested tables, mixed arrays and
quoted string keys. It rejects nulls, non-table roots, duplicate decoded keys
and out-of-range signed integers. Tool 19 reads that representation plus
bare/literal keys, comments, multiline arrays, leading plus signs and numeric
digit separators. A shared Wasm helper handles basic/literal strings and
Unicode escapes. The pair covers its documented assignment/inline-table
subset, not every TOML feature; headers and dotted paths remain unsupported.
Tool 20 reads INI into a two-level section/assignment object. The unnamed
section holds assignments before any header. Values stay strings, including
quotes, numeric-looking text and interpolation-looking text. It rejects
duplicate case-sensitive names, malformed UTF-8 and unsupported line syntax.
Tool 21 writes this representation back as INI, rejecting unrepresentable
data instead of inventing quoting or silently trimming values. A nonempty
unnamed section must come first. Only string-valued assignments are accepted;
named empty sections survive. Both actual Wasm directions are tested together.
Tool 22 reads dotenv assignments, including export prefixes, comments and
single/double/backtick quotes with physical multiline values. It follows the
documented common value conventions but rejects duplicates and malformed
syntax instead of silently dropping it. It neither loads an environment nor
expands variables. Tool 23 writes flat string properties, choosing between
unquoted, double-quoted, single-quoted and backtick forms. It rejects values
that this dialect cannot preserve. Both directions support longer Markdown
fences when literal multiline data contains a closing-fence line.
Tool 24 reads query strings using form-url-encoded decoding, with standard
UTF-8 replacement rather than rejection. Arrays of name/value pairs preserve
order, repeated names and empty names. Percent escapes are decoded after
splitting raw separators. Tool 25 writes that representation using UTF-8 form
encoding, canonicalizing the query spelling without sorting or dropping pairs.
It accepts exactly two strings per pair and replaces lone surrogates as the
browser API does; it neither coerces scalar types nor invents nested names.

## Shared number conversion

Start with exact integer digit accumulation and formatting for bases 2..36.
Build decimal/f64 parsing and formatting on top, including JSON's number
grammar, exponents, negative zero, rounding and finite-value restrictions.
Then cover JavaScript-style radix parsing and formatting, including signs,
prefixes, stopping at invalid digits, fractions and exceptional values.
The integer primitive alone is **not** enough to complete the number goal.

JavaScript's `Number` uses binary64; `parseInt`, `parseFloat`, strict JSON
parsing and whole-string numeric conversion have different acceptance rules.
Tests must keep those distinctions explicit. Decimal output needs round-trip
tests and boundary cases, not just small integer examples. See the
[ECMAScript number methods](https://tc39.es/ecma262/2024/multipage/numbers-and-dates.html).

## Fifty tools

Each tool has its own documented input/output contract, successful fixtures,
malformed-input checks and browser interaction test. Shared parsing, escaping
and serialization helpers are desirable; fifty names for the same conversion
with different constants would not satisfy this list.

1. Hierarchical JSON-shaped Markdown list to fenced JSON.
2. Fenced JSON to hierarchical JSON-shaped Markdown list.
3. Mad-libs placeholders plus a Markdown binding list to filled Markdown.
4. Fenced CSV to a Markdown table, with quoted-field handling.
5. Markdown table to fenced CSV, with proper quoting.
6. Fenced TSV to a Markdown table.
7. Markdown table to fenced TSV, rejecting unrepresentable cells.
8. Fenced JSON objects array to a Markdown table with a header union.
9. Markdown table to fenced JSON objects array.
10. Fenced JSON arrays array to a Markdown table.
11. Markdown table to fenced JSON arrays array.
12. Fenced JSON to indented fenced JSON, validating its syntax.
13. Fenced JSON to compact fenced JSON without altering string data.
14. Fenced JSON Lines to a fenced JSON array.
15. Fenced JSON array to fenced JSON Lines.
16. Hierarchical Markdown data to fenced YAML.
17. Fenced YAML's documented data subset to hierarchical Markdown.
18. Hierarchical Markdown data to fenced TOML.
19. Fenced TOML's documented data subset to hierarchical Markdown.
20. Fenced INI sections and keys to a hierarchical Markdown list.
21. Hierarchical section/key list to fenced INI.
22. Fenced dotenv assignments to a Markdown key/value list.
23. Markdown key/value list to fenced dotenv with quoting.
24. Fenced URL query string to ordered Markdown name/value pairs, decoding UTF-8.
25. Ordered Markdown name/value pairs to a percent-encoded query-string fence.
26. Fenced XML to a Markdown element/attribute/text tree.
27. Markdown element/attribute/text tree to escaped fenced XML.
28. Markdown outline of links to fenced OPML.
29. Fenced OPML to a Markdown outline of links.
30. Browser bookmark HTML to a Markdown folder/link outline.
31. Markdown folder/link outline to browser bookmark HTML in a fence.
32. Fenced RSS feed to a Markdown list of entries.
33. Markdown feed metadata and entries to fenced RSS.
34. Fenced iCalendar events to a Markdown agenda.
35. Markdown agenda to fenced iCalendar with line folding and escaping.
36. Fenced vCard contacts to Markdown contact lists.
37. Markdown contact lists to fenced vCard with escaping.
38. Fenced SubRip subtitles to a Markdown timestamp/text list.
39. Markdown timestamp/text list to fenced SubRip.
40. Fenced WebVTT cues to a Markdown timestamp/text list.
41. Markdown timestamp/text list to fenced WebVTT.
42. Fenced unified diff to Markdown file/hunk/change lists.
43. Markdown file/hunk/change lists to a fenced unified diff.
44. Fenced hexadecimal bytes to a UTF-8 text fence, validating both formats.
45. UTF-8 text fence to a hexadecimal byte fence.
46. Fenced Base64 to a UTF-8 text fence, validating both formats.
47. UTF-8 text fence to a Base64 fence.
48. Markdown integer/radix rows to a table of converted numeric strings.
49. Fenced JSON Patch to a Markdown operation/path/value list.
50. Markdown operation/path/value list to validated fenced JSON Patch.

The first tool uses `{}` and `[]` to identify object/array children. Ordinary
unquoted leaf values are strings. `= ` introduces a JSON numeric, Boolean or
null scalar. JSON-quoted strings represent ambiguous keys and string values,
including keys with spaces, empty keys, and escaped newlines. Decimal spelling
is preserved, not converted to binary64 and back during structural changes.

Mad libs substitute exactly. A binding of `time: yesterdy` yields `yesterdy`;
there is no implicit spellchecker. The demonstration uses `yesterday` to
produce the intended sentence.

## Browser interaction

Input and output sit side by side, each with independently switchable rendered
and Markdown-code views. Both code textareas are editable. Run transforms the
current input; output edits remain until the next run. Use the existing Wasm
Markdown renderer, with inert `data-href` links unless explicitly authorized.
Errors preserve the previous successful output and appear as text, not HTML.

The catalogue will link only implemented tools. Implementation documentation
remains reachable alongside the transform, including shared-pattern pages.
Completion requires all fifty, not just the first examples and this checklist.
