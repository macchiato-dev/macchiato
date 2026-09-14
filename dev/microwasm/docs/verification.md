# Verification checkpoint

The proof of concept has twenty executable Markdown documents. Instructions
are handwritten hex; tooling resolves only lengths/counts, copies source,
emits offset maps and validates the binary. No WAT or source-language compiler
is involved. The host code does not implement the filters or Life rules.

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

The reader now uses a 1,532-byte Markdown renderer assembled from six linked
Microwasm pages. It renders all twenty example documents and those six pages
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

The suite now has 74 tests. The first eight additions cover unsigned 64-bit parsing
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
twenty-example/six-renderer-page browser suite still passes.
There are three implemented transformations out of the planned fifty.

The JSON syntax scanner was compared with the native JSON parser on ten
thousand generated candidate strings and explicit grammar boundaries. List
conversion tests cover nested objects/arrays, escaped and empty keys, all
control-character escape forms, typed scalars, preserved decimal spelling,
128-container depth, skipped levels, invalid escapes and capacity recovery.
Browser tests edit the tree, render the JSON fence, preserve output after an
invalid number, and follow the implementation link to the shared numeric
scanner. The Wasm modules share memory and import functions directly.

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
