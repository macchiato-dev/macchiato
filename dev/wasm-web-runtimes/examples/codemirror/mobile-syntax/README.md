# Viewport-local mobile syntax modes

This experiment highlights large files without constructing or retaining a
full-document syntax tree. It runs the same CodeMirror application directly in
the browser, in QuickJS, and in MicroQuickJS.

## Design

Each mode is a CodeMirror `ViewPlugin`. On an update it:

1. Reads only `EditorView.visibleRanges`, expanded to complete visible lines.
2. Scans at most 400 preceding lines to recover bounded lexical state.
3. Parses and decorates the visible text.
4. Replaces its previous `RangeSet`, allowing syntax data for the old viewport
   to be collected.

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

This is intentionally lexical rather than grammatical. A small look-ahead in
the visible text recovers a closing delimiter whose opening delimiter is older
than the bounded lookback. JavaScript also treats a top-level declaration after
a blank line as a synchronization point for an unterminated template state.
Those heuristics keep work bounded, but cannot provide parser-level correctness
for every deliberately pathological file.

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
token classes, and asserts that visible characters, lookback characters,
retained tokens, and rendered marks remain bounded. It also records CDP heap
and DOM counters.

Set `MOBILE_SYNTAX_SCREENSHOTS` to a directory to retain one screenshot for
every runtime and language. `MOBILE_SYNTAX_RUNTIMES` and
`MOBILE_SYNTAX_TABS` can select a smaller diagnostic matrix.

The CDP heap number measures browser-realm JavaScript. It does not include the
QuickJS or MicroQuickJS linear memory, so the 64 MiB assertion is a useful host
pressure simulation rather than a claim about total process memory. The
retained-token and DOM assertions directly cover the syntax mode's bounded
state across all three runtimes.

## Current result

At the final viewport, the complete test retains 4–70 syntax tokens and scans
about 1,400–2,300 visible characters plus 15,600–28,400 lookback characters,
depending on the fixture and runtime. Host JavaScript heap use remained below
10 MiB in the measured run. The plain browser generally updated in under a
millisecond; QuickJS took about 1–7 ms; MicroQuickJS took about 2–30 ms, with
mixed HTML as the slowest case.

The result supports using viewport-local lexical modes as a mobile or large-file
fallback. It does not replace a full parser when exact syntax trees, structural
navigation, or refactoring semantics are required.
