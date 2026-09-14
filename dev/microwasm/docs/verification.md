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

- 31 Deno tests passed, including all twenty programs and the supplied app4
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

The reader now uses a 1,513-byte Markdown renderer assembled from six linked
Microwasm pages. It renders all twenty example documents and those six pages
itself. No host Markdown parser, imports, or remote rendering service is used.

- Wasm tests check exact HTML, nested lists and wrapped items, fences, CRLF,
  HTML escaping, inert link destinations, reset between calls, and recovery
  after input/output limits trap.
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
