# Viewport-local mobile syntax modes

This experiment highlights large files without constructing or retaining a
full-document syntax tree. It runs the same CodeMirror application directly in
the browser, in QuickJS, and in MicroQuickJS.

## Design

Each mode is a CodeMirror `ViewPlugin`. On an update it:

1. Walks quickly from the start of the document to the visible range to find
   the lexical state at which the visible text begins. This is a top-to-bottom
   pass, not a fixed look-behind window. It skips ordinary text and difficult
   long-line tails, and retains no tokens or syntax tree from this pass.
2. Reads `EditorView.visibleRanges`, expanded to complete visible lines.
3. Parses and decorates at most 2,048 characters of each visible line. The
   unhighlighted tail of a longer, usually minified, line receives only cheap
   delimiter bookkeeping.
4. Retains only the visible `RangeSet`. A keystroke discards those marks and
   all transient scan data immediately. Once activity pauses for 180 ms, it
   walks from the top again and rebuilds only what is shown. Scrolling uses the
   same disposable rebuild path.

This follows CodeMirror's documented large-document model: its
[`visibleRanges`](https://codemirror.net/docs/ref/#view.EditorView.visibleRanges)
exclude content hidden by collapsed ranges, and its own
[viewport-decoration example](https://codemirror.net/examples/zebra/) rebuilds
view-plugin decorations when the viewport changes.

The preceding scan tracks block comments and template strings in JavaScript,
comments and quoted strings in CSS, fenced blocks in Markdown, and HTML
comments plus `script` and `style` regions. Markdown fences delegate visible
JavaScript, CSS, and HTML text to the corresponding scanner. HTML delegates
visible `script` and `style` contents in the same way.

This is intentionally lexical rather than grammatical. JavaScript and CSS
state passes jump between string and comment delimiters. HTML finds the latest
unclosed comment, `script`, or `style` region and scans only that region's
contents. Markdown follows fences line by line. These shortcuts make the pass
fast and disposable, but cannot provide parser-level correctness for every
deliberately pathological file.

## Real-file fixtures

`build.js` constructs each fixture from files reported by `git ls-files`, while
excluding generated output and dependencies. JavaScript uses two substantial
application modules. CSS, Markdown, and HTML cycle through tracked files until
they contain at least 3,000 lines. HTML inputs with a line over 4,096 characters
are skipped so a nominally small viewport cannot conceal a very large line.

Each fixture ends with a probe whose multiline opener is above the final mobile
viewport. This exercises recovered lexical state, rather than merely showing
an opener and closer on the same screen. The Markdown and HTML probes also
exercise mixed-language highlighting. Generated fixtures contain roughly
3,100–3,500 lines in the current repository.

## Mobile test

Run the complete matrix with:

```sh
node --test --test-reporter=spec test/mobile-syntax.test.js
```

Playwright uses its iPhone 13 profile and launches Chromium with a 64 MiB V8
old-space cap. For every language and runtime, it verifies the real line count,
scrolls from the first viewport to the last, checks the expected mixed-language
token classes, and asserts that visible characters, state-pass characters,
retained tokens, and rendered marks remain bounded. It also records CDP heap
and DOM counters.

Run the controlled before/after typing comparison with:

```sh
node --test --test-reporter=spec test/mobile-syntax-comparison.test.js
```

That test uses real tracked 9,000–10,000-line files, an iPhone 13 viewport,
4× CPU throttling, and the same first-page edit trace. It measures CodeMirror's
normal parser first and the disposable viewport lexer second. It also scrolls
to a 9,900-character CSS line and verifies that highlighting stops after the
2,048-character cap. The normal MicroQuickJS Markdown comparison is omitted
because its DOM device does not yet implement CodeMirror's `EmphasisMark` node;
viewport Markdown remains in the correctness matrix.

Set `MOBILE_SYNTAX_SCREENSHOTS` to a directory to retain one screenshot for
every runtime and language. `MOBILE_SYNTAX_RUNTIMES` and
`MOBILE_SYNTAX_TABS` can select a smaller diagnostic matrix.

The CDP heap number measures browser-realm JavaScript. It does not include the
QuickJS or MicroQuickJS linear memory, so the 64 MiB assertion is a useful host
pressure simulation rather than a claim about total process memory. The
retained-token and DOM assertions directly cover the syntax mode's bounded
state across all three runtimes.

## Current result

In the final controlled first-page run, normal JavaScript parsing reached a
42 ms physical-keystroke p95 in the plain browser, versus 16 ms for the viewport
mode. Under QuickJS, direct JavaScript edit dispatch fell from a 44 ms p95 to
25 ms; under MicroQuickJS it fell from 34 ms to 9 ms. CSS and HTML showed the
same reduction in direct dispatch work. Physical-key timing has more runtime
and browser-layout noise, but its medians generally improved as well.

At the final viewport, the correctness matrix scans the full preceding text for
scalar state but retains only the visible tokens. After removing accidental
token construction from state recovery, a 123,836-character mixed-HTML state
pass and visible recolor took about 13 ms in MicroQuickJS. Host JavaScript heap
use remained below 10 MiB in the measured run.

The result supports using viewport-local lexical modes as a mobile or large-file
fallback. It does not replace a full parser when exact syntax trees, structural
navigation, or refactoring semantics are required.
