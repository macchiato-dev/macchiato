# Verification checkpoint

The proof of concept has twenty executable Markdown documents. Instructions
are handwritten hex; tooling resolves only lengths/counts, copies source,
emits offset maps and validates the binary. No WAT or source-language compiler
is involved. The host code does not implement the filters or Life rules.

## Checkpoint: inner-function number-formatting walkthroughs

The radix and precision formatting pages now explain the inner quotient,
interval, carry, normalization and layout loops. Branch diagrams distinguish
continuation from termination; state tables tie destructive scratch changes
and saved values to the actual byte-list labels. Worked traces include base-two
10.5, an all-nine intermediate coefficient, negative cutoffs and signed zero.
These are qualitative explanations of the handwritten code, not generated
function inventories. Mermaid remains readable source in the partial renderer.

Both modules assemble byte-for-byte identically to the preceding commit.
Ten focused radix/precision tests pass, including two new groups checking
the documented numeric examples. The build and complete documentation browser
suite pass. The browser suite checks all six source/display combinations
and now captures the new internal-state tables; the 1440-by-900 screenshots
were visually inspected. Published transformation count remains 35.

## Checkpoint: calendar pair completes tools 1–35

Tool 35 is a 2,040-byte handwritten writer. It consumes component headings
and property rows, validates decoded headers, shares the reader's value-mode
decision, and writes escaped logical iCalendar lines. A separate pass measures
UTF-8 widths and stores fold positions; backward expansion adds CRLF line
endings, 75-octet folding and a sufficiently long Markdown fence without a
second output buffer.

The reader now exports two read-only helpers and folds ASCII letters only.
An unconditional OR with 0x20 was unsuitable when reused for punctuation in
the agenda title: it could equate NUL with space or CR with hyphen.
All 65,536 byte pairs are checked against ASCII-only case folding. Reader
size is now 2,342 bytes; its previously published 2,286-byte size predates
these exports and the comparison correction.

Seven writer test groups cover exact fixtures, 250 generated reader round
trips compared independently with ICAL.js, nested time zones and alarms,
unknown properties, quote/caret-preserving headers, mode mismatches, sibling
closure, invalid heading depth, JSON/UTF-8 errors, every forbidden control,
surrogate pairs, folds around each scalar width, and long Markdown fences.
An independent string/code-point oracle checks folding, including continuation
spaces. Capacity cases exercise exactly 64 KiB of input and 128 KiB of output,
overflow, immutable input/literals and repeated-run recovery.
The complete suite passes 300 tests. The writer's catalogue fixture is also
checked byte-for-byte and includes UID, DTSTAMP and a UTC DTSTART.

All 35 browser fixtures pass, along with editor/view switching and failure
recovery. The calendar scenario writes the reader's agenda, checks component
closing order and TEXT escapes, keeps an invalid edit from replacing output,
then reads the emitted calendar back through the UI. Textarea comparisons
account for native CRLF-to-LF normalization; module tests check exact CRLF bytes.
The complete document-view browser suite passes too. These screenshots were
visually inspected:

- `dist/browser/35-agenda-to-ical-walkthrough.png`
- `dist/browser/agenda-to-ical-rendered.png`

The internal explanations cover heading look-ahead and cursor restoration,
decoded-header boundary checks, scalar/escape state, fold measurement and the
overlapping backward move. Fifteen tools remain; vCard contacts are next.

## Earlier checkpoint: agenda reader and deeper function walkthroughs

Tool 34 is published as a 2,286-byte module, using the shared calendar reader.
Its two-pass component walk retains properties and child components separately
without allocating a tree. Headers remain lexical; TEXT values and lists are
decoded explicitly. Dates and recurrence rules are not interpreted.
The reverse writer (35) remains pending; 34 of 50 tools are implemented.

Seven new test groups bring the suite to 293 passing tests. They include
200 generated event comparisons against ICAL.js, the documented nested
component trace, explicit VALUE overrides, quoted parameters, UTF-8 split
inside physical folds, depth limits, exact 64 KiB input and 128 KiB output,
malformed input, recovery and immutable literal checks. The catalogue's exact
expected output is also checked, including its trailing newline.

The function walkthroughs now break down the RSS writer's descriptor dispatch,
decoded-key comparison, per-object duplicate masks, repeated-field ownership
and overlapping framing move. Its 2,454-byte binary is unchanged. The agenda
reader explains local lifetimes, multi-value operand-stack order, both passes'
cursor transitions, mode overrides and the distinct escaped-comma branch.
These are qualitative explanations tied to byte-list labels, not generated
function inventories.

The complete document browser suite passes, including all six display/content
combinations. The transform suite passes all 34 fixtures, editing, rendering,
boundaries and recovery. One concurrent browser run closed unexpectedly;
the standalone rerun passed. The new calendar scenario checks nested headings,
property ownership, inert script-looking text and failed-run output retention.
Visually inspected screenshots:

- `dist/browser/33-entries-to-rss-walkthrough.png`
- `dist/browser/34-ical-to-agenda-walkthrough.png`
- `dist/browser/ical-to-agenda-rendered.png`

## Earlier checkpoint: iCalendar content-line groundwork

The 1,185-byte `00-calendar-lines` helper is published with its original and
resolved Markdown, hex, offset map and Wasm. Unfolding copies to a separate
page before validating restored UTF-8. Content lines and quoted parameter
lists return spans without mutation, preserve delimiter ownership and reject
malformed headers. The prose, flowcharts and traces explain the actual source
cursor and quote-loop behavior. LF input is an explicit editing convenience;
bare CR is rejected.

Six new tests bring the complete suite to 286 passing tests. They include
300 folded calendars checked against ICAL.js 2.2.1, folds at every byte boundary
of representative UTF-8 text, 1,000 generated byte strings checked against a
fatal native decoder, quoted/empty/multiple parameters, forbidden controls,
full-page input, exact span boundaries, read-only snapshots and recovery.
ICAL.js is test tooling, not a shipped runtime dependency.

The complete document-view browser suite passes. Its added Chromium check
executes the helper with quoted CN data, folding and a split emoji sequence.
`dist/browser/calendar-unfold-walkthrough.png` was visually inspected.
The agenda component/value layer and its writer are still pending; this
shared helper does not change the count of 33 completed transformations.

## Checkpoint: explanations inside numeric functions

The JSON binary64 parser and shortest-decimal formatter now have worked
inner-function breakdowns, not just pipeline summaries. These cover the
coefficient cursor and digit budgets, power countdown, quotient-bit subtraction,
rounding and subnormal boundary, candidate-buffer reuse, half-way suffix scan,
carry propagation and final notation branches. Examples follow the actual
memory representation, including the parser's unreduced decimal ratio.

Both assembled binaries are byte-for-byte identical to the preceding commit:
1,009 bytes for the parser and 1,067 bytes for the shortest formatter. All
eight binary64 tests pass. The rebuilt site passes the complete browser
document suite, including original/filled/hex and source/rendered combinations.
The inner-loop sections were also opened and visually checked at 1440×900;
screenshots are `dist/browser/04-json-binary64-walkthrough.png` and
`06-shortest-decimal-walkthrough.png`. Mermaid remains visible source, as
specified for the partial Markdown renderer. This is a focused documentation
pass, not a claim that every remaining function has equally deep coverage.

## Checkpoint: RSS writer completes tools 1–33

Tool 33 is published as a 2,454-byte handwritten module. The list compiler
provides compact JSON, whose source page is reclaimed before RSS output.
The writer uses fixed field descriptors, per-object duplicate masks and the
shared XML scalar/string routines. Attributed text retains a source span
until all attributes have been emitted. Its documentation walks these loops
and cursor lifetimes, with diagrams and byte-list references.

Six tests cover all standard shapes, 300 generated round trips through the
Wasm reader and an independent SAX projection, malformed contexts and types,
escaped-key duplicates, required fields, Unicode and XML normalization,
backtick-fence isolation, empty-array normalization and recovery. Bounds tests
exercise a complete 64 KiB input, an independently measured compact JSON
larger than 64 KiB, exactly 128 KiB of output and one byte too much. Immutable
tables are checked after the list compiler's 1 KiB stack region, not across
that deliberately mutable region.

The complete suite passes 280 tests. All 33 transformation fixtures pass in
Chromium, as does the complete document-view suite. The RSS browser scenario
converts reader output back to XML, checks it using the browser's DOMParser,
checks order and string-preserved enclosure length, verifies inert rendered
output, retains successful output after an unknown field, and recovers after
editing. `dist/browser/entries-to-rss-rendered.png` was visually inspected.

The iCalendar pair is next. Seventeen planned tools remain; the overall goal
is not complete.

## Checkpoint: RSS metadata and entries reader

Tool 32 is now published, with a 3,395-byte module and the existing shared XML
helpers. It preserves the standard channel structures and item fields in the
hierarchical data notation. Ordered repeated fields become arrays. Text and
CDATA are joined into strings; dates and numeric-looking values keep their
lexical spelling. Qualified extension fields are deliberately omitted rather
than claiming lossless RSS archival or complete RSS semantic validation.

Seven tests bring the complete suite to 274 passing tests. They cover 500
generated feeds against an independent SAX/object projection, all standard
channel structures, required fields and attributed values, duplicate singleton
fields at different bit positions, declarations and normalization, extension
isolation, malformed XML, punctuation edits, complete input-page occupancy,
intermediate overflow, excessive depth and recovery. Both source and literal
regions remain unchanged after successful calls.

All 32 browser fixtures pass, along with the complete document-reading suite.
The RSS scenario checks field and array order, preservation of `0012` as a
string, inert script-looking description text, unchanged source after view
switches, and previous-output retention/recovery after a duplicate title.
Its screenshots are `dist/browser/rss-to-entries-rendered.png` and
`rss-to-entries-last-entry.png`, both visually inspected. The last-entry check
scrolls the output pane and verifies that the final item fits within it.

The module's walkthrough explains per-call seen masks, required fields,
singleton emission versus repeated-field rescans, attribute/text ownership,
and the eight-byte schema records. Rescans are per fixed repeated field kind,
not per item. The reverse RSS writer is next: 32 tools are complete, 18 remain.

## Checkpoint: read-only XML cursor for RSS

The shared `00-xml-walk` module is 1,107 bytes. It is used after whole-document
XML validation, not in place of it. Six test groups cover exact token and
attribute offsets, 500 generated trees compared to independent SAX events,
subtree boundaries, normalization deferred to the caller, invalid intervals
and incomplete delimiters, 32-level depth, full 64 KiB input, reentrant calls,
and byte-for-byte unchanged memory. The suite has 267 tests at this checkpoint.

An initial source-boundary test had its fixture one byte short; the corrected
fixture now fills the first memory page exactly. Another check made the empty
element case at depth 32 explicit: although it has no separate end token, it
still adds one XML level and must not bypass the nesting bound.

The documentation includes a token/span table, the attribute loop's delimiter
ownership, and a worked subtree-skip trace with fake end tags inside CDATA.
No RSS tool is counted yet. There remain 31 published tools and 19 to finish.

The browser comparison also walks a feed-shaped XML document and compares
the ordered events against Chromium's XML DOM: repeated categories, a GUID
attribute, enclosure attributes, text references, CDATA, comments and a PI.
The standalone host code in that test is an oracle, not a shipped RSS parser.

## Checkpoint: bookmark import and function-level walkthroughs

Tool 30 is a 2,989-byte browser-bookmark reader plus the shared HTML character
and UTF-8 helpers. Its six test groups bring the suite to 261 passing tests.
They compare 500 generated documents with independent parse5 and CommonMark
trees and round-trip through the handwritten Wasm bookmark writer. They also
exercise empty-label hierarchies, quoted and unquoted attributes, title
preference, malformed input hidden in discarded metadata, exact memory bounds,
depth limits and reuse after a trap. It does not emulate all browser HTML repair.

The browser transformation suite passes all 31 catalogue fixtures. The new
import scenario checks a decoded title, literal script-looking label text,
nested folders, inert `data-href`, unchanged source across display switches,
and retention of the prior output after malformed input. Its screenshot is
`dist/browser/bookmarks-to-outline-rendered.png` and was visually inspected.
The complete documentation browser suite also passes all examples, helper
and transformation documents in Original/Filled counts/Hex and both display
modes. Mermaid stays readable source rather than requiring a diagram library.

The reader's walkthroughs now expose inner branches and state owners, with a
folder/list trace and separate attribute and character-decoding loops. Binary
search and insertion sort also have expanded branch diagrams and traces:
half-open bounds and signed value comparisons for search; the moving hole,
two inner exits, and operand-stack reuse for insertion sort. Those two
documentation-only changes preserve their compiled bytes (139 and 163 bytes).

There are 31 published transformations and 19 remaining. This is a progress
checkpoint, not completion of the fifty-tool goal.

## Repeat the checks

From `dev/microwasm`:

```sh
deno task test
deno task build
deno task serve
# In another shell, with Playwright's Chromium installed:
deno task test:browser
```

Verified with Deno 2.7.13 and Playwright 1.60.0 / Chromium, on 2026-09-14:

- 32 Deno tests passed, including all twenty programs and the supplied app4
  externref module instantiated with a non-DOM tree-building host.
- All twenty browser examples loaded, ran their default input, and displayed
  resolved Markdown with no remaining placeholders and valid executable hex.
- Factorial accepted input changes, displayed a trap for 13, then recovered.
- CSV converted manually entered quoted fields, doubled quotes, Unicode and
  embedded record endings. Unit tests also covered generated quoted records.
- Life changed on a step, restored a blinker after two steps, advanced a glider
  while playing, allowed direct cell edits, and killed an isolated cell.
- Light/dark desktop screenshots and a 390-pixel mobile Life screenshot were
  captured; desktop and mobile checks found no horizontal page overflow.
- Browser page-error collection was empty. Source files and artifacts are
  local; the browser does not fetch fonts, renderers or other CDN assets.
- The browser suite also passed through the existing declarative directory
  app at `http://microwasm.localhost:3030/`, without restarting that server.
- Replacing hidden start/end comments with visible `[microwasm]` labels left
  all twenty compiled Wasm SHA-256 hashes unchanged. Each label captures one
  ordinary Markdown list, with no closing marker.
- A generic CommonMark 0.31.2 renderer was also checked independently: all 41
  markers across the twenty documents render as visible inline code followed
  by a bullet list (`<ul>`). No Microwasm rendering extension was used.

Screenshots are generated in `dist/browser/`, not committed. This checkpoint
does not claim cross-browser certification or exhaustive formal validation.

## The self-rendering documentation

The reader now uses a 2,679-byte Markdown renderer assembled from seven linked
Microwasm pages. It renders all twenty example documents and those seven pages
itself. No host Markdown parser, imports, or remote rendering service is used.

- Wasm tests check exact HTML, nested lists and wrapped items, fences, CRLF,
  HTML escaping, inert link destinations, reset between calls, and recovery
  after input/output limits trap.
- Literal strings use a single unsigned 8-bit length. Tests check the table's
  recorded lengths, empty and 255-byte strings, the 127/128 boundary, embedded
  zero bytes, and not reading past the given length.
- Long malformed delimiters exercise bounded forward progress rather than
  repeatedly rescanning the remaining input. The timing assertion is only a
  generous regression smoke test, not a benchmark claim.
- Browser tests exercise original, filled-counts and hex documents in both
  rendered and Markdown-source views. The two selectors remain independent;
  hex uses a normal fenced block and is checked as executable Wasm.
- Mermaid source remains visible in code blocks; nested byte lists retain
  their hierarchy. Renderer pages link to each other through the reading UI.
- The browser DOM checks escaping and inert external/script links, and tests
  the host's local-document allowlist beneath a simulated project prefix.
  Unknown paths, remote origins and query-bearing targets are not enabled.
- Screenshots include the renderer's module and scanning-pattern pages,
  alongside light/dark example views and the mobile Life reading view.

This is intentionally partial Markdown, not CommonMark conformance. A fixed
20-page memory avoids allocation and growth during rendering. That memory
cost is separate from the module's byte size.

## Transformation work, current checkpoint

The suite now has 205 tests. The first eight additions cover unsigned 64-bit parsing
and formatting in bases 2..36, JSON number syntax, Mad libs, and hierarchical
Markdown list to JSON conversion.
The numeric tests compare more than ten thousand value/radix combinations
against native BigInt formatting and test every possible digit byte in every
radix.

Seven further tests exercise fixed-slot multiword arithmetic and strict JSON
decimal-to-binary64 parsing. The arithmetic checks carry/borrow chains, shifts,
aliasing, normalization and 8192-bit capacity against test-only BigInt oracles.
The parser checks exact halfway values and decimal neighbors (including
1200-digit tails), subnormal/normal transitions, signed zero, overflow and
exponent cancellation across a 64 KiB input. Generated tests compare 2500
decimal inputs to native conversion and approximately 5000 native shortest
decimal strings to their original binary64 values. Invalid syntax/spans trap;
subsequent calls recover and output-region sentinels remain unchanged.
The parser does not import host arithmetic or parsing functions. The shared
memory is fixed at 256 KiB; input and scratch occupy separate regions.
Three further tests cover multiword small-divisor quotient/remainder and exact
decimal expansion. Complete decimal strings are compared with a test-only
rational oracle and read back through both the Wasm and native JSON parsers.
Two tests cover shortest finite decimal output, matching native spelling on
more than 13,000 cases: every normal power-of-two boundary and both neighbors,
decimal powers and their neighbors, small subnormals and random bit patterns.
The results also round-trip through the Wasm parser. This formatter deliberately
reuses exact expansion and up to 34 parser calls; it is not a native-throughput
claim.

Six additional tests cover JavaScript-style `parseInt` and `parseFloat` text
interfaces. They check radix prefixes, all byte values in every radix,
negative zero, NaN and infinity, and exact large-integer rounding against
test-only BigInt accumulation. Unicode whitespace is compared across the BMP
with the native whitespace class; partial/invalid UTF-8 does not get accepted
as a space. Decimal-prefix parsing is compared with the native parser on
10,000 generated syntax candidates and 2500 generated numeric prefixes.
Full 64 KiB tokens, output sentinels, invalid spans and subsequent recovery
are tested. The public strict JSON parser still rejects looser decimal forms.

Four more tests cover multiword addition and shortest binary64 formatting in
all radixes 2..36. The test oracle reads the emitted text as an exact rational,
compares it with the adjacent binary64 midpoints, searches every coarser radix
grid to check minimal precision, and checks nearest/even candidate choice.
The corpus includes random bit patterns, small fractions, smallest/largest
finite values, binary boundaries, radix powers and their adjacent values.
Power-of-two radix spellings are also compared to native output at the tested
binary boundaries. Odd-radix native spellings are not the sole oracle.
Invalid radix traps, recovery, digit/output sentinels and alternating decimal
and nondecimal calls are covered. Significant-digit and positional-zero
generation are separate; subnormal base-two output can exceed a thousand bytes.

Three further tests cover whole-string `Number(text)` conversion. They compare
10,000 generated syntax candidates and hundreds of large prefixed integers
and decimals against native conversion. They exercise empty/all-space input,
surrounding Unicode whitespace, signed decimal zero, forbidden signs on radix
prefixes, invalid suffixes even after overflow, full 64 KiB input, buffer
preservation and recovery after invalid spans. The input preservation check
compares bytes rather than using a decoder that consumes a leading BOM.

JSON scalar formatting is checked against `JSON.stringify` on explicit
boundaries and 1000 generated binary64 bit patterns. Nonfinite values become
`null`; finite values and negative zero use their JSON numeric spellings.

Four precision-formatting tests compare all supported counts on explicit
boundary values, exact dyadic ties and carry chains, plus 4000 deterministic
binary64 bit patterns and decimal-power neighbors. Native `toFixed`,
`toExponential` and `toPrecision` are the oracles. Tests check negative rounded
zero, retained trailing zeros, method-specific nonfinite/error ordering,
invalid counts, trap recovery and scratch-region sentinels. The shipped
module also runs in Chromium through the browser test's numeric dependency
graph, without host formatting imports.

Four JSON-to-list tests cover every value kind, verbatim numeric/string
tokens, duplicate keys, 600 generated nested values and round trips through
the list-to-JSON module. Truncated and perturbed documents are checked against
native JSON acceptance. Invalid fences, escape syntax, the 128-container
boundary, exact 64 KiB input, output overflow, input preservation and recovery
are covered. Browser tests run the published module, edit both successful and
invalid inputs, switch its display modes and preserve output on errors.

The browser suite checks all library documents in the six independent
content/display combinations, as well as the original examples and renderer
pages. It instantiates the built numeric dependency graph in Chromium and
checks parse/shortest-format results across ordinary/scientific notation,
signed zero and extreme finite values, with no host numeric callbacks. It also
checks the shipped integer/decimal prefix parsers on signs, bases, whitespace,
ignored suffixes, incomplete exponents, NaN and infinity. Browser checks also
exercise fractional radix formatting, a long binary subnormal, and the
whole-string parser's differing acceptance rules.

The new transformation browser suite checks editable input/output, independent
rendered views, literal substitution, failure recovery and inert user links.
Desktop light/dark and mobile screenshots were inspected. The existing
twenty-example/seven-renderer-page browser suite still passes.
There are nineteen implemented transformations out of the planned fifty:
tools 1–25.

Four CSV-to-table tests cover quoted commas, doubled quotes, embedded record
endings, empty fields, width checks, forbidden controls, malformed fences and
400 generated rectangular datasets. Tests use an independent CSV encoder and
decode the emitted table's character references back to the expected cells.
Exact 64 KiB input, output overflow, unchanged input and recovery are
checked. Two renderer tests cover table recognition, block transitions,
malformed separators, row-width mismatches and bounded decimal-reference
parsing. Browser tests check actual header/body cell text, preserved embedded
newlines, inert markup-like CSV values, invalid-input recovery and mobile
layout. Light, dark and mobile screenshots were inspected.

Four table-to-CSV tests cover always-quoted fields, doubled quotes, decimal
Unicode references, punctuation escapes, separator/width validation and 500
generated round trips through the two actual Wasm converters. Tests include
embedded backtick runs, long fences, exact input capacity, wrapping overflow,
memory isolation and recovery. The renderer's additional regression test
checks long fences, shorter apparent closing fences inside CSV, escaped pipes
and punctuation. Browser tests edit both valid and invalid tables, compare
decoded input cells, and verify that CSV with embedded triple backticks remains
one complete rendered code block. Its side-by-side screenshot was inspected.

Six TSV tests cover its distinct quote and delimiter rules, empty fields,
Unicode, 500 generated round trips and rejection of unrepresentable decoded
tabs/line endings. They check grammar and capacity errors, full-size inputs,
memory isolation, and repeated CSV/TSV switching on the same instances after
traps. The adapters are verified to re-export the actual dependency function
and memory, without a second allocation or a host conversion callback. Browser
tests edit both TSV tools, check literal quotes in rendered results and
preserve previous output on invalid input. Both screenshots were inspected.

Five JSON-formatting tests cover exact string/number tokens, duplicate keys,
empty containers, scalar roots, LF/CRLF fences and 800 generated nested
documents. Both modes are compared with native formatting where lexical
identity is not at issue; separate hand-written fixtures assert duplicate
keys and unusual numeric/escape spellings that native object conversion would
lose. Idempotence, pretty/compact round trips and alternating list/JSON modes
on the same parser instance are checked. Truncated and perturbed inputs use
native parsing as an acceptance oracle. Tests cover malformed fences, invalid
controls/escapes, 128-container depth, exact 64 KiB input, output overflow,
unchanged input, sentinel bytes and recovery. Adapters are checked to export
the dependency's actual function and memory. Browser checks edit both tools,
keep JSON-like markup inert, compare rendered code with exact tokens, and
preserve the previous output on malformed JSON.
Both new side-by-side screenshots were inspected. This container's available
fonts show the CJK fixture as a missing-glyph box; the textarea and rendered
code text are independently asserted to contain the original Unicode data.

Six JSON Lines tests cover all JSON value kinds, empty streams, CRLF, exact
lexemes, nested delimiters and escaped quotes. They include 600 generated
round trips, malformed records and fences, non-array roots, and mutation
tests against native JSON acceptance. Both directions are tested at 64 KiB
input, including 32,761 records. Depth tests account for the outer array so
the forward converter cannot emit an array too deeply nested for the reverse.
The lower-level compact-span entry is checked for input/output separation,
invalid bounds, starting depth, exact output capacity, recovery and unchanged
input. Sentinel bytes guard the shared parser's literals, the JSON Lines
module's literal and unused memory. Browser checks compare both literal and
rendered outputs after edits, keep string markup inert, retain successful
output after malformed records, and recover to an empty stream or array.
Both side-by-side screenshots were inspected. The browser recovery case
caught an overly strict minimum length for an empty `jsonl` fence without a
newline after its closing backticks. The lower bound was corrected, direct
regressions were added, and the full transformation browser suite passed.

Five JSON-row tests cover explicit cell types, exact numeric/string lexemes,
nested structures, duplicate keys, Markdown-active bytes and every ASCII
character in strings. An independent table encoder checks 600 generated
rectangular datasets. Tests reject ragged, non-array and zero-column rows,
malformed JSON and invalid fences; they check the 128-container boundary and
recovery. A 64 KiB input exercises every available scratch byte, a 13,000-cell
header exercises large output, and larger/escape-heavy rows trap at the output
limit. Input preservation, untouched scratch tails and the shared parser's
literals are verified. The browser flow checks typed rendered cells, inert
markup, retention after a ragged-row error and recovery to empty output.
The side-by-side screenshot was inspected: quoted strings, an embedded pipe,
duplicate object keys and markup-like string text all remain distinct cells.

Six typed-table reverse tests cover exact JSON values, empty documents,
Unicode reference decoding, punctuation escapes and 600 generated round trips
through both actual Wasm modules sharing memory. Negative cases include
multiple values in one cell and JSON punctuation split across cells that
could otherwise form a valid combined document. They also cover malformed
JSON, ragged tables, separator errors, depth limits and recovery. Exact input
and per-cell scratch capacities, untouched original input, scratch sentinels
and parser literals are checked. The new numeric `validMemory` entry is
tested through the final memory byte; the original `valid` still rejects
spans outside the first page. JSON scratch-span checks reject output overlap,
literal overlap and out-of-memory bounds. Browser tests render both sides,
compare exact JSON text, keep markup inert, reject a multi-value cell while
retaining the prior result, and recover to the empty-array result.

Four JSON-key tests exercise the allocation-free comparator: ordinary and
escaped forms, 2,000 generated UTF-16 strings, Unicode scalar boundaries,
surrogate pairs, escaped lone surrogates, case/normalization distinctions,
encountered invalid escapes/UTF-8, invalid spans, unchanged memory and long
common prefixes. The helper imports only memory and remains a shared pattern,
not a transformation of its own. Early difference is not full JSON validation;
the object-table converter validates the entire document first.

Six object-table tests cover first-appearance header order, absent/null/empty
string distinctions, later-introduced keys, empty rows, exact nested JSON
tokens, prototype-like names and every ASCII character in keys/strings.
An independent encoder checks 500 generated sparse row sets. Negative cases
include non-object rows, zero-column nonempty tables, semantically duplicate
keys, malformed JSON and fences, the 1,024-column limit, nesting overflow,
and output expansion beyond 112 KiB. Exact 64 KiB input fills the final
scratch byte; original input is checked unchanged and subsequent runs recover
after traps. Chromium runs all fourteen fixtures and checks the new union's
actual header/cell text, literal markup, missing versus null, duplicate-key
failure retention, and empty-array recovery. The inspected screenshot shows
editable source beside its rendered table, with the escaped spelling sharing
the original column.

Seven reverse-object-table tests cover blank/missing/null distinctions,
header spelling, Unicode references, JSON escapes, equivalent duplicate
headers, exact numeric and nested tokens, and 600 round trips through the
actual Wasm pair. Round trips compare union-column order rather than claiming
to recover each original object's property order. Negative cases isolate
each JSON cell, reject malformed table shapes and check column, depth, input,
scratch and output bounds. A repeated 10,000-character header deliberately
overflows output into temporary records; the next conversion rebuilds them
and succeeds. Large header pairs test decoding without a retained string
store. The shared decoder's new API is tested for invalid spans, raw text
decoding, exact scratch capacity, untouched output/input/literals and recovery.
An exact 120 KiB result leaves the adjacent header records intact; increasing
the repeated header by one byte traps. Chromium verifies all fifteen tool
fixtures, both rendered views of the new reverse tool, preserved JSON header
spelling, inert markup-like values, rejection of duplicate headers and
cross-cell JSON injection while retaining output, and recovery to `[{}]`.
The side-by-side rendered screenshot was inspected. The full example,
renderer and six-view source-document browser suite also passes.

The string helper now exposes a bounded three-result iterator. A fifth helper
test checks cursor/pending-unit handoff, escaped NUL versus end, final-memory
positions, and invalid spans or pending values. Its 871-byte module still
imports only memory; the equality implementation is unchanged.

Six YAML-writer tests compare block output against `@std/yaml@1.2.0` under the
JSON schema, used only as a test oracle. Cases include scalar roots, mappings,
sequences, empty containers, type-like strings, exact numeric spellings, every
code point below 160, supplementary Unicode, escaped controls, mapping-key
uniqueness at different depths, and 500 generated nested datasets. Long keys
are parsed in explicit-key form, including Unicode and control-rich keys.
Memory tests cover an exact 64 KiB input, a compact intermediate filling the
last page, an exact 128 KiB result, overflows and reuse. The independent parser
also reconstructs all 128 levels of the maximum-depth sequence. Lone surrogate
units are rejected rather than published as nonportable YAML string values.
These tests establish the writer's stated data subset, not full YAML support.
Chromium passes all nineteen fixtures and edits the writer's input to
check block indentation, string/boolean distinctions, Unicode decoding and
literal markup. Duplicate keys and lone-surrogate errors keep the successful
output; a later empty-sequence input recovers. The screenshot was inspected:
the two panes and escaped newline are visible. This container's installed
fonts have no emoji face, so the supplementary-character sample displays a
missing-glyph box there; its exact `😀` text is verified in the DOM and by the
independent parser. The complete source-view/example browser suite also passes.

Five YAML scalar tests exercise the shared decoder independently: every
Boolean/null casing, single-quote doubling, comment and mapping delimiters,
raw versus escaped controls, Unicode validity, exact output limits, input
isolation and reuse after traps. The independent oracle collapses negative
zero; a separate check verifies that our token and numeric value preserve it.
The 1,681-byte helper imports only actual Wasm functions and shared memory.

Five reverse-reader tests cover block structure, explicit long keys, semantic
duplicate detection, missing values, LF/CRLF, malformed fences and indentation,
unsupported YAML features and recovery. Five hundred generated nested values
pass through the actual Wasm writer and reader; another cycle has identical
output. Boundary checks include a full 64 KiB input, an exact 128 KiB result,
one-byte output overflow, 128 nested collections and rejection of a 129th
empty collection. Source order is tested separately for numeric-looking
string keys, because JavaScript objects reorder those names.

The reader is 1,582 bytes, plus its documented shared dependencies. Browser
checks exercise editable YAML, independently rendered nested-list output,
literal HTML-like strings, preservation of successful output on invalid YAML,
and subsequent recovery. The inspected screenshot shows both panes, nested
levels, escaped apostrophes and distinct Boolean/null tokens correctly.

Six TOML-writer tests cover assignments, nested inline tables, mixed arrays,
empty containers, dotted/empty/long names, every code point below 160 and
supplementary Unicode. Five hundred generated nested datasets are checked
with `smol-toml@1.8.0`; a simpler dataset is also checked with
`@std/toml@1.0.11`. Both are test-only imports executed by Deno. The latter
rejects the valid minimized case `data = {x = []}` unless a space is inserted
before the closing brace. That oracle limitation is not worked around in the
Wasm output. The [TOML inline-table syntax](https://toml.io/en/v1.0.0#inline-table)
and the second parser agree on the emitted structure.

Integer tests cover 402 candidates around both signed 64-bit endpoints,
comparing accepted output text and the second parser's BigInt result.
Overflowing accumulation, null at multiple depths, duplicate escaped keys,
invalid roots and malformed strings trap and allow subsequent recovery.
Numeric spelling remains exact; the floating-point consumer may round or
overflow, as documented. Memory tests cover exact 64 KiB input/intermediate
sizes, exact 128 KiB output, overflows, and all 128 nested collections.

The 1,377-byte TOML module imports actual Wasm functions and memory, with no
host conversion callback. Browser checks cover source edits, rendered fenced
output, literal markup, quoted dotted keys, empty arrays inside inline tables,
the largest signed integer, invalid-input retention and recovery. The
side-by-side screenshot is checked separately from text assertions.

Four TOML-string tests verify basic and literal quoting, all short escapes,
four/eight-digit Unicode escapes and scalar boundaries. They generate 2,000
candidate code points and compare valid scalars with `smol-toml@1.8.0`.
Lone surrogates, surrogate pairs encoded as separate TOML escapes, values
above `0x10ffff` (including values with the high bit set), raw controls and
malformed UTF-8 trap. Span tests cover exclusive source positions, unchanged
input, full-page strings, exact destination boundaries and scratch isolation.
The helper is 833 bytes and imports only the Wasm iterator and memory.

Seven reverse-TOML tests exercise assignments, inline tables, mixed/multiline
arrays, comments, quoted/bare names, empty containers and the strict TOML 1.0
inline-table separator rules. Five hundred generated datasets pass through
both actual Wasm directions with stable output on another cycle. Mutated
decimal candidates compare acceptance and numeric value with the independent
parser; signed-zero spelling is checked separately. Two hundred and two
integer candidates around the signed 64-bit endpoints check range handling
and accepted BigInt values. Duplicate decoded keys are rejected within their
table scope; sibling tables may reuse names.

The reader's 2,032-byte module leaves original input and scratch intact.
Tests fill all 64 KiB of input and exactly 128 KiB of output, then exceed the
output by one byte. They reach 128 collections including the root, reject
another level, and reuse the same instances after failures. Invalid comments,
UTF-8, fences, unsupported table headers and dotted paths are also covered.
Chromium edits TOML source, checks independently rendered nested list output,
preserves the last result after invalid input, and recovers. The inspected
screenshot shows the array/table nesting, normalized port number and literal
HTML-like string in the side-by-side panes.
The rendered side-by-side screenshot was inspected: the embedded pipe remains
in one cell, markup-like text stays literal, and duplicate keys and exponent
spelling are visible unchanged in the JSON output.

The JSON syntax scanner was compared with the native JSON parser on ten
thousand generated candidate strings and explicit grammar boundaries. List
conversion tests cover nested objects/arrays, escaped and empty keys, all
control-character escape forms, typed scalars, preserved decimal spelling,
128-container depth, skipped levels, invalid escapes and capacity recovery.
Browser tests edit the tree, render the JSON fence, preserve output after an
invalid number, and follow the implementation link to the shared numeric
scanner. The Wasm modules share memory and import functions directly.

## INI reader checkpoint

Five INI tests cover named/unnamed/empty sections, case-sensitive names,
first-delimiter splitting, LF/CRLF, literal quotes/backslashes, comments and
string-valued numbers/booleans. Five hundred generated named-section documents
compare with the independent `@std/ini@0.225.2` parser, which is test-only.
The colon delimiter and unnamed-section representation are checked against
explicit fixtures rather than assumed to match that parser's defaults.

Duplicate sections/keys, long names, Unicode, malformed UTF-8 (including
comments), raw controls and unsupported lines are exercised. Tests fill the
entire 64 KiB input and exactly 128 KiB output, exceed each boundary, verify
unchanged scratch memory and recover using the same instance. The module is
1,552 bytes and imports only the existing Wasm key/Unicode helper and memory.

Chromium runs all 20 transformation fixtures and edits the INI source. It
checks section nesting, literal HTML-like strings, preservation of the last
successful output after errors, and recovery. The inspected screenshot shows
the side-by-side editable source and rendered section/assignment hierarchy.
The reverse writer adds five tests, including 500 generated documents checked
against Deno's INI parser and cycled through both actual Wasm modules. Tests
check canonical LF/equals output, literal quote/backslash/comment-like text,
typed-value rejection, duplicate decoded names, Unicode boundaries, surrogate
pairs, significant whitespace, unsupported nesting and control characters.
The exact 64 KiB source and intermediate boundaries are exercised, along with
overflow, malformed UTF-8 and reuse after failure. INI decoding does not
expand strings like TOML's control escaping, so the writer tests do not claim
to fill its 128 KiB output region. Stores still check that boundary.

The writer is 1,158 bytes in addition to its shared list compiler and Unicode
helper. No host conversion callbacks are used. The browser checks independently
rendered input/output, exact fence text and previous-output retention after
unrepresentable input, then recovers on the same page. The inspected screenshot
shows the nested input alongside the INI fence, with literal HTML-like text
and the empty section preserved.

## Dotenv reader checkpoint

Seven tests cover assignment separators, export prefixes, comments, empty and
numeric-looking strings, three quote delimiters, multiline values, CR/CRLF
normalization and retained backslashes. Five hundred generated documents
compare with `dotenv@17.2.3`'s pure `parse` function under Deno. That independent
parser is used only in tests; neither its file/environment loading code nor
any JavaScript conversion code is included in the browser tool.

The implementation documents stricter handling of duplicates, unterminated
quotes, ambiguous final backslashes and trailing text. Tests cover these
differences explicitly, along with long keys, case-sensitive names, numeric
name order and prototype-looking names. Unicode boundaries, raw controls and
malformed UTF-8 are tested in values, quotes and comments. The module validates
the body before parsing and never performs variable expansion.

The 2,046-byte reader fills the 64 KiB input and 128 KiB output limits in
tests, rejects an extra byte, leaves scratch intact and recovers on the same
instance. Chromium edits a multiline assignment, checks it becomes a single
list item, verifies literal HTML-like text and `${TITLE}`, and preserves the
previous successful output through duplicate/unterminated/trailing-text errors.
The inspected screenshot shows the physical multiline source on the left and
its escaped single-item representation on the right, with the variable
reference and HTML-like text displayed literally.
The reader also accepts matching longer Markdown fences and rejects an
earlier closing fence rather than treating it as quoted value text.

The 1,834-byte dotenv writer adds six tests. Five hundred generated objects
round-trip through both actual Wasm modules and compare with the independent
dotenv parser. All 7,381 strings up to four characters drawn from an alphabet
of letters, quotes, backticks, backslashes, hashes, spaces, LF and CR are
tested. Successful writes must preserve the string through both parsers;
rejections must have no usable candidate among the four quoting forms, as
checked independently through the reader.

Additional fixtures cover Unicode, surrogate pairs, invalid names, duplicate
decoded keys, unsupported structures, typed values and unrepresentable
strings. Input/intermediate limits and temporary-output reuse are checked.
An embedded 43,680-backtick line expands both fences to fill exactly 128 KiB
of output; one more value byte traps without overwriting scratch. Such large
outputs exceed the reader's own 64 KiB input limit, which remains explicit.

CommonMark 0.31.2 independently verifies that emitted multiline values remain
inside a single code fence, including indented and longer embedded backtick
lines. Chromium checks the same case through the side-by-side UI and reads
the writer's output back with tool 22. The inspected screenshot shows the
embedded backtick line and following assignment together in the same code
block, alongside editable list source. There are 27 transformations still
pending; this is not goal completion.

## Query reader checkpoint

The 1,634-byte standalone query reader adds six tests. One thousand generated
ordered pair lists are serialized by `URLSearchParams`, then decoded by the
actual Wasm module. Two thousand generated raw queries also compare directly
with that independent parser. Repeated/empty names, first-equals splitting,
encoded separators, plus signs, literal fragments and bad percent escapes
are covered explicitly.

All 256 one-byte and 65,536 two-byte sequences are percent-encoded and checked
against `TextDecoder` with BOM retention. Ten thousand longer byte sequences,
scalar boundaries, truncation and invalid-continuation recovery extend that
comparison. Direct malformed UTF-8 at the Wasm ABI is also tested. Input is
unchanged; exact 64 KiB input and 128 KiB output cases pass, excess output
traps without writing beyond its region, and the instance recovers afterward.
Queries that would close their own Markdown fence are rejected, with percent
encoding documented as the lossless spelling.

The browser suite edits percent-encoded HTML-looking data and repeated names,
checks rendered output remains text, retains the previous result on malformed
framing and runs successfully again. Its screenshot is
`dist/browser/query-to-list-rendered.png`.

The 830-byte query writer adds six more tests, reusing the list compiler and
Unicode iterator. All 65,536 UTF-16 code units compare with `URLSearchParams`,
including lone-surrogate replacement. All 2,800 sequences of one through four
units from a seven-unit alphabet check surrogate pairing and peek behavior;
1,000 astral scalars check the raw UTF-8 path. One thousand generated pair
lists round trip through both actual Wasm modules and match the browser API.
Reading then writing malformed query spellings is checked for canonicalization.

Every ASCII byte, duplicate and empty names, embedded delimiters, controls,
BOM and Unicode are covered. Wrong types and pair sizes trap and recover.
CommonMark checks prove encoded field contents cannot close the output fence.
Exact 64 KiB input, 64 KiB intermediate JSON and 128 KiB output cases pass;
one-byte excesses trap, preserving the source and the scratch boundary.
The browser checks edit pairs, render a single query fence, retain successful
output on invalid shapes and recover with an empty query. The screenshot is
`dist/browser/list-to-query-rendered.png`.

## XML primitives checkpoint (not yet tools 26–27)

The 1,649-byte helper adds six tests. Character, name-start and name-part
predicates are compared at every Unicode position through U+10FFFF with
`xmlchars@2.2.0`'s XML 1.0 Fifth Edition rules. Name scanning also checks
delimiters and names accepted by `saxes@6.0.0`, with namespace processing off.
Both dependencies are test-only; the shipped helper is entirely Wasm.

Numeric references exercise 10,000 code points in decimal and hexadecimal,
leading zeros, maximum scalars, invalid characters, overflow and malformed
names. One thousand generated spans compare text and attribute normalization
with saxes. Literal mode, raw backslashes, CRLF versus referenced whitespace,
invalid UTF-8, exact output capacity, final-memory-byte reads and recovery
after traps are checked separately. Input remains unchanged. Browser tests
also compare text and attribute normalization with Chromium's DOMParser.

This does not prove an XML document parser: structural parsing, declarations,
tag matching, duplicate attributes and the reverse tree writer are still to
be implemented. The transformation count remains 25.

## XML reuse for OPML reading

The XML string helper is now 1,699 bytes. Its new `next` entry returns one
normalized character and its next source offset without memory writes; the
existing `string` loop uses it too. Two additional tests check exact cursor
movement at three memory locations, 500 generated spans against Saxes in
text/attribute/literal contexts, malformed references and UTF-8, mode/bounds
rejection, and recovery. Referenced whitespace must remain distinct from raw
whitespace. All earlier string and document tests continue to run.

The 2,875-byte XML document reader now has `readSpan`, sharing its document
body with the fenced entry. Two added tests compare varied-offset raw spans
with fenced output, preserve the source/literal regions, check exact input
bounds and nesting, and alternate the entries after failures. Raw backticks
are accepted as XML data rather than mistaken for a Markdown fence. Browser
tests compare both entries and the iterator over the existing 100 XML cases.

This is preparation for tool 29, not a new transformation. There are still
28 published tools; the OPML-specific reader has not been completed.

## Checkpoint: bookmark HTML export

Tool 31 is published before the reverse reader, retaining the planned
numbering. The 2,134-byte module parses the Markdown outline directly and
uses the existing scalar/character output helpers. Folder items open H3/DL
structures; link items emit complete A elements. A byte stack distinguishes
the closing behavior and rejects descent below a link. Empty documents and
folders are representable; browser metadata is outside this outline model.

Five tests cover titles, CRLF, empty labels, balanced link delimiters,
non-HTTP destinations, 500 generated trees, punctuation substitutions,
malformed input, invalid UTF-8, 128 levels and rejection of a 129th, exact
64 KiB source and 128 KiB output capacity, overflow, and repeat recovery.
An independent CommonMark parser verifies the fence and parse5 verifies the
actual HTML tree with implied DT/P endings. The Wasm leaves input, literals
and the memory beyond its 128-byte kind stack untouched.

The browser fixture checks both panes' display switches. Additional browser
tests compare title, folder and link values using DOMParser, ensure generated
HTML stays inert in its rendered code fence, and confirm a failed edit keeps
the previous successful output before a later valid edit recovers.
The full suite passes 255 tests; all 30 transformation browser fixtures pass.
The rendered bookmark output screenshot was also inspected at 1440×900.

There are now 30 published transformations: 1–29 and 31. Tool 30 and tools
32–50 remain, along with the final full collection review. This is not goal
completion.

## Checkpoint: HTML character reader for bookmark imports

The shared reader has all 2,231 WHATWG names, including semicolon-less aliases
and two-scalar replacements. Its byte table remains visible in the Markdown;
the index is broken into short rows rather than one opaque long line.
The source data's retrieval date and SHA-256 are recorded alongside it.

Five tests compare every named entry with the independent entities decoder,
every BMP numeric reference, C1 replacements, overflow-resistant accumulation,
all ASCII bytes at digit boundaries, attribute ambiguity, malformed UTF-8,
exact source bounds, pending results and untouched memory. The numeric digit
test caught punctuation being misclassified as digit 9; its lower bound is
now explicit in both the bytes and the function breakdown.

Chromium checks the names in both text and attribute contexts, plus malformed
references, raw CR/NUL and astral text. Ordinary text returns a NUL token;
the HTML body tree builder drops it, while attributes replace it with U+FFFD.
The test keeps that distinction rather than claiming this helper builds a DOM.
The oracle uses an explicit document DOCTYPE and body, as a bookmark document
does. A separate probe found Chromium's bare-fragment DOMParser path preserved
an attribute NUL in an astral-containing string, whereas the full-document
path replaced it as specified. That discrepancy is not emulated in Wasm.

All 250 tests, the static build, and the browser document checks passed at this
checkpoint. There are still 29 published transformations; this helper does not
advance the fifty-tool count.

## Checkpoint: OPML reader and rendered outline parity

Tool 29 is now published: the 2,698-byte module validates the fenced OPML
through the shared XML reader, then emits its selected title/label/link tree.
The XML reader is now 2,893 bytes with its fence-line check exported for reuse.
No XML or Markdown implementation in JavaScript ships with the transformation.

Seven new tests cover 500 generated XML trees and Wasm writer round trips,
128 combinations of empty/nonempty labels, punctuation substitutions,
normalization, ignored malformed XML, versions and required attributes,
unsafe/unsupported destinations, fences, Unicode, 30 outline levels, exact
64 KiB input and 128 KiB final output, intermediate overflow and trap recovery.
The independent CommonMark checks found that an empty child can be a Setext
heading underline. The Markdown emitter now separates it from a preceding nonempty item
without adding a blank line between consecutive empty parents and children.

The browser test found that the partial renderer retained angle delimiters
and backslash escapes in destinations. Its link scanner now handles the
angle form and skips escaped delimiters; a small decoded-text helper applies
punctuation/reference decoding followed by HTML escaping. The destination
remains `data-href`, never an active URL. One additional renderer test checks
these paths, escaped closing brackets/parentheses, missing delimiters, and
quote references that must not create another attribute. The complete renderer
is 2,975 bytes, still assembled from seven readable Markdown pages.

The suite now has 245 tests. All 29 browser fixtures also exercise independent
Code/Rendered modes, editable panes, bounds and failure recovery. The OPML
reader's browser scenario checks decoded title, nested empty item, literal
markup, inert destination, source preservation and recovery. Its screenshot
is `dist/browser/opml-to-outline-rendered.png`.

There are 29 published tools and 21 still to implement. This checkpoint does
not complete the goal.

## Checkpoint: WebVTT reader and writer

Tools 40 and 41 now preserve cue payloads, timestamps, optional identifiers
and settings, plus ordered NOTE/STYLE/REGION blocks and optional header text.
The reader is 1,969 bytes; the writer is 2,259 bytes. Both reuse a 630-byte
timestamp helper that compares arbitrarily long hours as digit spans.
These are individual module sizes, excluding their shared dependencies.

The writer's seven test groups cover its documented examples, 500 generated
collections through separate reader/writer machines, field ordering, keyword
ambiguity, physical-line boundaries, timing order, malformed edits, Unicode
escape equivalence, every lone surrogate, exact input capacity, framed-output
overflow, scratch reuse and recovery after traps. Original and resolved
Markdown assemble to identical bytes. CommonMark sees the output as exactly
one literal code block, even with decoded backtick lines in the payload.

Playwright runs the reader on generated subtitle data, passes its actual
Markdown result into the writer, and loads that writer output as a local
text-track Blob in a separate Chromium page. The browser's VTTCue objects
match the expected timing, identifiers, text and alignment. No substitute
WebVTT serializer runs in the application. Invalid edits retain successful
output; later valid edits recover. Both editable and rendered views work.
Screenshots `cues-to-vtt-rendered.png` and `41-cues-to-vtt-walkthrough.png`
were inspected in `dist/browser/`.

Verification: 352 Deno tests passed in two complete file partitions
(182 and 170). Both browser suites passed, including all 41 transformation
fixtures and the seven-page Markdown renderer. There are nine transformations
left; this checkpoint does not complete the goal.

## Size is the complete module, not memory consumption

| Example | Wasm bytes |
| --- | ---: |
| Factorial | 85 |
| Fibonacci | 94 |
| GCD | 68 |
| Integer power | 86 |
| Prime test | 91 |
| Population count | 69 |
| Array sum | 100 |
| Minimum and index | 138 |
| Binary search | 139 |
| Insertion sort | 163 |
| ASCII uppercase | 129 |
| ROT13 | 173 |
| Count lines | 119 |
| UTF-8 validation | 278 |
| Balanced brackets | 207 |
| Run-length encoding | 178 |
| Run-length decoding | 159 |
| JSON string escaping | 326 |
| CSV to JSON | 607 |
| Game of Life | 255 |

These measurements include each module's header, sections, exports and code.
They exclude the browser UI and runtime memory. Array/filter modules allocate
one or two 64 KiB pages; the arithmetic-only modules allocate no linear memory.
