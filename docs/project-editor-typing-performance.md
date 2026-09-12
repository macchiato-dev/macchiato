# CodeMirror typing: parser readiness and view updates

## Reproducible diagnostic

`packages/project-editor/test/bulk-input.browser.test.js` compares the same
compiled editor, grammar, source, and input sequence in native JavaScript and
MicroQuickJS. Its order is native, guest, guest, native, with a fresh browser
context and an input warmup for each run. Run it alone, without builds or other
browser suites competing for CPU.

For a large JavaScript file, set these environment variables before running
`node --test packages/project-editor/test/bulk-input.browser.test.js`:

- `MACCHIATO_TEST_SOURCE_FILE`: absolute source-file path.
- `MACCHIATO_TEST_RAW_SOURCE=1`: do not wrap the source in an HTML comment.
- `MACCHIATO_TEST_EDITOR_LANGUAGE=javascript`.
- `MACCHIATO_TEST_EDITOR_WIDTH=585`: the measured split-pane width.
- `MACCHIATO_TEST_INPUT_METHODS=paste`.
- `MACCHIATO_TYPING_CHECKPOINTS=1`: test-only inclusive phase timings.
- `MACCHIATO_TEST_ARTIFACTS`: a distinct directory for the JSON results.
- `MACCHIATO_TEST_TYPING_POSITION=last`: optionally type at the end of the
  document instead of the first-page offset. Navigation time and the subsequent
  wait for a parsed viewport are reported separately from individual keys.

The normal case starts typing after paste, undo, and redo. The optional
`MACCHIATO_TEST_PARSE_BEFORE_TYPING=1` control explicitly finishes the syntax
tree first using CodeMirror's `forceParsing`, with a 20-second diagnostic budget.
It fails unless the complete tree is available and records that preparatory
cost separately. This is not a proposed production loading policy. Both cases
still check exact text after every key, typo correction, undo/redo, absence of
browser errors, and eventual viewport highlighting. Checkpoints report both
viewport and complete-document parse readiness.

## September 12 checkpoint

Production artifacts: root commit `46efa6ae`. Input: a retained real JavaScript
source file, 106,402 characters, SHA-256
`c3cd3b6b0019280ad17f7b49b911fc066960e7b0f225a10ddc569d51a83d140e`.
The first-page edit inserts into its opening import declaration, deliberately
passing through invalid syntax. It does not represent every editing position.

These are the two guest runs per condition. Phase timings are inclusive and
overlap: **do not sum rows** or subtract them as if they were exclusive samples.

| Eight-key sequence | Parsing catching up | Fully parsed before typing |
| --- | --- | --- |
| Parser work | 286–381 ms | about 26 ms |
| View update | 388–413 ms | 292–295 ms |
| DOM-tree update | 149–160 ms | about 96 ms |
| Plugin updates | 73–88 ms | about 73 ms |
| Mutation-record processing | about 2 ms | 1–2 ms |

Native individual keys took 5–21 ms in these runs. Guest keys remained slower,
including approximately 90 ms keys even after finishing parsing. Earlier runs
of the fully parsed control spent another 820–863 ms preparing the tree; that
pause must not disappear from an evaluation of initial responsiveness.

A separate DevTools profile confirms substantial Wasm execution, with little
self time in bridge dispatch. That profile is not a clean latency benchmark.
The readiness comparison shows that parser catch-up matters, but does not
explain all typing cost. Inspect DOM-tree reconstruction, plugin work, and their
guest allocations next. There is no evidence here for changing mutation-event
delivery, introducing stale DOM caches, or shipping a forced full parse.

Local evidence under `/root/macchiato-work`: `lifecycle-typing-profile.log`,
`lifecycle-typing-profiles/`, `fully-parsed-typing.log`, `parsed-dom-phases.log`,
`catchup-dom-phases.log`, and their result directories. These changes add only
diagnostic coverage; the live server and Bunny archive are unchanged.

## View-update breakdown and rejected iterator experiment

The checkpoints also measure the root tile's DOM synchronization and each
installed plugin's update. Plugin labels include their index and constructor
name from this build, not a stable CodeMirror API identifier. Instrumentation
remains entirely in the optional test fixture.

With a complete syntax tree, the two initial guest runs spent about 35 ms in
root DOM synchronization within 94–95 ms of DOM-tree updates. The syntax
highlighter accounted for 53–54 ms within 71–73 ms of plugin updates. This
distinguishes actual DOM synchronization from building CodeMirror's tile tree;
it does not justify caching live browser state or skipping highlighting.

An external build-only experiment reused the private result object in Babel's
array-fallback iteration helper instead of allocating one per loop step. The
custom-iterator branch was unchanged. Both the core and language sources define
the helper, so the meaningful candidate changes both, not just the core.
It passed the existing content, undo/redo, and parse-readiness assertions, but
did not demonstrate a speedup: DOM-tree updates measured 107–109 ms, versus
100–106 ms in the subsequent unchanged control. The initial control had been
94–95 ms, illustrating why adjacent repeat controls matter. The candidate is
not shipped and is not a generally validated helper replacement.

The benchmark now accepts `MACCHIATO_TEST_EDITOR_SOURCE_FILE` and
`MACCHIATO_TEST_LANGUAGE_SOURCE_FILE` for such external candidates. It compiles
the selected sources into temporary bytecode before browser measurements and
uses those same sources in the native comparison. Defaults still select the
generated production sources; no generated production artifact is overwritten.

Evidence under `/root/macchiato-work`: `parsed-sync-phases*`,
`reused-iterator-both-phases*`, and `parsed-sync-control-repeat*`.
`experiment-iterator-result.js` and the two `reused-iterator-*.js` outputs retain
the rejected candidate outside the repository. No production speedup is claimed.

## Live-property traffic and binary transfers

`MACCHIATO_WIRE_CHECKPOINTS=1`, together with the ordinary typing checkpoints,
counts operation kinds and returned string sizes, and times host wire calls.
It is opt-in: thousands of counter/timer calls add measurable overhead. Use
the ordinary checkpoints for the adjacent candidate/control latency comparison.

With the native-intersection build and the complete syntax tree available, the
eight-key sequence reads about 3,340 parents, 3,250 next siblings and 1,110 first
children. It decodes only 498 strings / 3,968 wire bytes, taking approximately
1–2 ms. Returned-string decoding is therefore not a useful explanation of this
typing latency. These remain live DOM reads; no stale tree cache was introduced.

An external candidate bypassed batch/result array allocation for a single
property get. With detailed wire counters off it reduced root DOM sync from
about 38 ms to 32–33 ms over eight keys, less than a millisecond per key.
View-update totals were noisy, including an extra asynchronous update in one
control. The additional wire-format branch is not shipped. Evidence and its
build-only script remain under `/root/macchiato-work/single-property-*` and
`experiment-single-property.js`.

A separate binary-write test exposed a much clearer avoidable cost: outbound
Uint8Array payloads called the interpreted byte writer once per byte. The guest
now checks capacity once and uses TypedArray.set, matching the existing inbound
copy strategy. The independent golden-byte fixture checks offset source and
destination views, empty payloads, capacity failures and source independence.
In the isolated MicroQuickJS test, 32 writes of 64 KiB took approximately 620 ms
before and less than 1 ms afterward. That is a binary-encoding microbenchmark,
not an application startup or typing-speedup claim. Evidence:
`/root/macchiato-work/wire-bytes-write-{baseline,copy}.log`.

## Native-input cost and large returned strings

The checkpoint fixture also records phases around each bulk input operation,
before undo/redo and ordinary first-page typing. In the `insertText` control,
Chromium's input path itself is expensive: the same 106 KB JavaScript document
takes 6–7 seconds in the native editor and roughly 9 seconds in MicroQuickJS.
CodeMirror's measured native observer flush is only about 52 ms of that elapsed
time. Do not attribute the entire browser input duration to the guest interpreter.

Unlike the eight-key sequence, this insertion returns a 106 KB string and about
434 KB across all wire string reads. The interpreted decoder consumes about
660 ms. The candidate native reader copies validated UTF-8 into MicroQuickJS's
own string storage. It roots the input view across allocation and reacquires its
storage after possible arena compaction. It adds no host call or permission.
Malformed UTF-8 is rejected; this internal wire operation is not a complete
TextDecoder implementation (in particular it preserves an initial BOM).

The new fixture checks independent Unicode bytes, embedded NULs, view offsets,
invalid sequences/ranges/types, and returned-string independence. It allocates
64 MiB of strings in the 32 MiB arena with only a small retained window, leaving
a dead buffer before the source to exercise relocation during automatic GC.
Comparisons use the old JS decoding path rebuilt against the same native-slot
ABI, not an old bytecode file with the new Wasm. The external control script is
`/root/macchiato-work/disable-native-text-read.js`.

The same-ABI comparison passes exact text, typo correction, undo/redo and
viewport highlighting checks in both native and guest editors. Returned-string
decoding falls from 666–684 ms to 14–53 ms in the two guest runs. Total insertion
does not establish an improvement: controls take 9.3–10.6 seconds and candidates
9.2–10.8 seconds, while the native controls themselves vary from 6.5–7.0 to
8.3–8.6 seconds. Keep the narrower decoding result separate from end-to-end
responsiveness. The compaction/Unicode fixture and all 26 runtime/output
regressions pass. Evidence: `native-text-read-{control,candidate,relocation,
regressions}*` beneath `/root/macchiato-work`.

A follow-up paste comparison without phase or wire instrumentation shows a
clearer end-to-end benefit. The identical 106 KB HTML-comment input takes
730–798 ms in the old-decoder guest and 134–151 ms with native decoding. Native
browser controls remain 26–40 ms. Each configuration uses native/guest/guest/
native order, matching bytecode ABI, source and editor builds. Both preserve
exact pasted text, first-page typo correction, undo/redo and highlighting.
Evidence: `native-text-read-paste-{control,candidate}*`. This supports a large
paste improvement, not a claim that all browser input or ordinary typing is
five times faster.

## Browser editing traces and child-list membership

`MACCHIATO_BROWSER_TRACE_DIR` optionally records DevTools timeline traces around
bulk input, using a CDP stream. It adds no instrumentation to the production
host or guest. Trace durations are inclusive; nested categories must not be
added together, and traced latency is not an uninstrumented speed comparison.

For the 106,402-character JavaScript input, both native and guest runs receive
3,868 native input events and perform approximately 5,830 layouts. In the first
native run, layout accounts for 3.9 seconds within an 8.6-second task; browser
JavaScript function calls total about 169ms. In the first guest run, layout
accounts for 5.6 seconds within a 13.7-second task, and function calls total
about 2.0 seconds. There is real guest overhead left to reduce, but most of this
particular bulk-input path is not time spent in the interpreter. Exact text,
undo/redo and first-page typo correction pass in native/guest/guest/native
order. Evidence: `/root/macchiato-work/native-insertion-browser-trace*`.

The guest's private child-lifetime mirror had a separate quadratic membership
check: every old child searched the complete new child list. It now indexes
the freshly read host IDs in a temporary null-prototype object. Public DOM
reads remain live, child order remains in the original array, and the scratch
index contains booleans rather than retaining wrappers. No host API changes.

The identity-cache test now exercises 100, 1,000 and 4,000 children, reverses
their order, moves one to a different parent, removes another, and checks
wrapper identity and collection afterward. Five 4,000-child reconciliations
take 128–144ms in adjacent controls and 23ms in the candidate. The corresponding
1,000-child figures are 13–15ms and 5.6ms. These are isolated bookkeeping
measurements, not a claim of an equivalent whole-editor speedup.

A Set-based candidate was rejected: it took 320ms at 4,000 children. Our added
C collection shim currently uses a linear search, so creating and querying
that Set added another quadratic scan. This is not an intrinsic limitation of
MicroQuickJS. A future collection index needs careful treatment of moving GC,
weak entries, equality and insertion order; this change does not redesign it.
Candidate/control logs and build-only source are under
`/root/macchiato-work/child-membership-*`.

## Identity-keyed native collections

`MACCHIATO_COLLECTION_CHECKPOINTS=1` adds test-only method counts, strong-map
sizes, key types, and one example stack for large collections. It requires the
ordinary typing checkpoints. It does not retain collection keys or values;
weak collection sizes are deliberately not inspected. Counts do not equal
entries actually scanned. The wrappers add overhead, so disable them for
candidate/control latency comparisons. Native stacks identify call sites more
fully than the current MicroQuickJS stack representation.

On the 106 KB JavaScript fixture, eight first-page edits make about 3,233 Map
gets, 3,164 sets, and 2,645 has calls. Their keys are objects and the largest
map has 1,301 entries. The matching native stacks locate these large maps in
CodeMirror's tile-reuse cache and `destroyDropped`, not its syntax parser.

The native collection lookup now classifies a non-number/non-string query
once and compares raw identities. Numbers and strings retain SameValueZero
handling, including NaN, signed zero, and separately constructed equal strings.
This remains a linear lookup; it introduces no hash table, cache, heap field,
or host operation. Moving GC still relocates the same key/value pairs.

The independent mixed-key/compaction fixture checks 18 key kinds/values,
primitive equality, distinct objects, weak object keys, clear/delete, and
2,000 retained object keys with reverse lookups and alternating deletion.
Its 12,000 timed object lookups fell from 40 ms to 6.5 ms. All 17 native-runtime
callback fixtures passed. The bare runtime grew from 187,004 to 187,133 bytes.

## Static palette lookup experiment

`MACCHIATO_HIGHLIGHT_CHECKPOINTS=1` adds optional timings for the active
highlighter's style resolution, decoration building, and range-builder calls.
The fixture obtains the highlighter facet from an uninstalled extension; it
does not replace the editor's extensions. Fine-grained timing overhead is
significant, so turn it off for candidate/control latency measurements.

The fully parsed 106 KB JavaScript control makes 7,744 style calls across eight
keys. These are repeated tag-to-class choices, not unique syntax ranges.
The test-only palette-cache experiment leaves tree traversal and decoration
building intact. Weak tag keys avoid retaining discarded language metadata;
comparing ancestry lists also invalidates choices after in-place tag changes.
Palettes with an `all` style stay on the original path.

With only the ordinary phase checkpoints, an adjacent control spends 52–60 ms
in the highlighter across the eight keys. The ancestry-validating candidate
spends about 34 ms in both guest runs. Total view-update time remains noisy
(240–279 ms in the candidate); do not infer a proportional editor speedup.
Rendered text, class names, and span boundaries on 62 lines match the control
in each native/guest/guest/native run of the initial weak-key candidate.
This initial measurement preceded rebuilt-Wasm and broader editor checks.

Evidence: `/root/macchiato-work/highlight-phases*`, `highlight-memo-*`.

### Rebuilt palette cache

The editor now uses `cacheHighlightStyle` for its own fixed palette. Unit tests
compare native palette results across the built-in tag vocabulary, derived and
modified tags, duplicates, unknown tags, reordered/mutated input groups, ancestry
changes, and repeated theme switches. It preserves the original stylesheet
module and does not affect other highlighters or cache mutable DOM information.
The temporary fixture implementation was removed after integration; optional
phase measurements remain test-only.

The rebuilt candidate and adjacent unchanged-core control use the same runtime,
grammar, 106 KB source, and native/guest/guest/native sequence. With the tree
already parsed, the highlighter takes 33.4 ms across eight keys versus 53–54 ms
in the control. View updates take 236–240 ms versus 266–271 ms. Individual keys
take 23–81 ms versus 26–85 ms; native CodeMirror remains faster. These are limited
local observations, not fixed performance guarantees or equivalent speedups
for the whole app.

Rendered text, class names, and span boundaries match the unchanged-core
control across 62 rendered lines in each run. These are within-runtime
comparisons: the guest intentionally uses scoped class names unlike native
CodeMirror. The same benchmark also checks exact source edits and undo/redo.
Without pre-finishing the tree, both configurations pass, but parser work
varies and dominates some early keys. The cache does not solve that delay.

All 389 editor/runtime tests pass, along with the full Resources editing flow
and ten delayed startup/reload theme cases. Screenshots were inspected. The
matched editor Wasm grows by 648 bytes; the host and controller do not change.
The four saved examples pass read-only checks with both exported and live
assets. The local server and `7857226` Bunny archive now include this change.
See `/root/macchiato-work/highlight-cache-*` for tests, comparisons, and images.

With collection counters disabled, the two candidate guest typing runs spent
78–87 ms in DOM-tree updates versus 91–106 ms in the initial controls. View
updates were 251–258 ms versus 264–275 ms. These are inclusive phase timings
over eight keys, not a sixfold editor speedup. Repeating the unchanged control
afterward gave 40.7 ms for isolated lookups, 104–105 ms for DOM-tree updates,
and 276–281 ms for view updates. Retained native/guest/guest/native results are under
`/root/macchiato-work/collection-identity-*`; count/type/stack evidence is under
`/root/macchiato-work/typing-collection-*`. Exact input, correction, undo/redo,
and eventual highlighting assertions pass in each comparison.

The benchmark's optional `MACCHIATO_TEST_RUNTIME_FILE` selects an engine for
same-ABI comparisons without overwriting generated runtime artifacts. It does
not make arbitrary engine/bytecode combinations compatible.

## Reconfiguring a language without rebuilding the view

The editor previously destroyed its `EditorView` whenever the requested
language changed. That replaced the native editing surface and discarded
selection/history even when the text was identical. It now reconfigures the
existing language compartment. Unchanged content is not submitted as a full
document replacement; genuine content changes still use an ordinary CodeMirror
transaction. This adds no history implementation, DOM cache, or host behavior.

The stamped/downloaded language regression fails against the previous build:
the first HTML-to-Markdown switch changes the editor element, and switching
away while HTML downloads resets position 34 to zero. With the rebuilt editor,
all covered language switches retain the same native content element. A late
HTML download cannot activate its parser on the current plain-text document;
returning to HTML preserves the edit/selection and normal undo restores the
original text. Markdown fences still request their own language on demand.
The download sequence remains the same twelve shared grammar bundles, with
JS/JSX/TS/TSX sharing one bundle and no unrelated extra requests.

This proves removal of a redundant view reconstruction, not an end-to-end
latency improvement or a per-tab context/history implementation. The separate
explicit construction benchmark still destroys its view intentionally and is
not a language-switch measurement. Before/after evidence is in
`/root/macchiato-work/language-reconfigure-{before,after}.log`.

## Highlighting recovery is not project validation

The editor used to walk the available Lezer tree after every non-JS/HTML/CSS
edit, returning `syntaxErrors: true` on the first recovery node. Both project
refresh schedulers used that flag to block the whole output. Thus an unfinished
JSON, Rust, Python, or TypeScript resource could block refresh even if the app
did not consume it. A highlighting grammar is also not the application's
parser, and a partially parsed tree cannot establish that a file is valid.

The editor now reports source changes without this execution veto. The real
debounced builder and output runtime retain their checks and error handling;
the workspace owner still parses configuration JSON separately. Existing
consumers receive the same `syntaxErrors` field, set to false by the editor.
The obsolete tree-walking helper and its two policy tests are removed, with
replacement tests at the editor notification and owner-validation boundaries.

Before the change, both stamped/downloaded browser tests fail on the malformed
JSON fixture's blocking flag. After rebuilding, malformed JSON/Rust/Python/TS
edits reach the actual build/output validator. Owner tests verify invalid
configuration is delayed and blocked without a compilation request, valid
configuration recovers, and ordinary data resources reach compilation unchanged.

This removes a linear traversal of the available parse tree from each edit;
it does not make parsing, highlighting, or document serialization free, and
no proportional end-to-end speedup is claimed. No tree cache, host primitive,
or permission was added. Evidence is under
`/root/macchiato-work/editor-validation-{before,after}.log`.

## Repeated font-edit recovery in the full workspace

The disposable Resources browser workflow now alternates valid `monospace`,
`"monospace"`, and `serif` declarations with an unfinished quoted family.
Both quoted and unquoted complete values are valid; the compiler correctly
rejects the unfinished quote. Tests inspect computed font families before and
after rejection, not just the presence of a replacement heading. The working
document remains connected and its button still responds while the warning is
visible. A final valid edit clears the warning without replacing the output
iframe or editor machine. Screenshots cover the rejected and recovered states.

The first run incorrectly expected the warning prefix `Blocked:`; the actual
workspace displays `Output stopped:` for this build error. The corrected test
passes without a production-code change. The final strengthened run, including
the rest of the full editing workflow, passed in approximately 77 seconds.
Evidence is under `/root/macchiato-work/font-edit-preservation*`. These are
disposable fixture edits, not changes to the owner's Mahjong or saved projects.

## Last-page typing and foreground parser budget

The comparison now checks both first-page and last-page typing. It navigates
with actual keyboard commands and checks the exact insertion offset after
every key, including the correction. The last-page case does not force a full
parse first. A separate result records the post-typing wait for viewport parse
readiness, so quicker keys cannot hide postponed highlighting work. That wait
includes Playwright polling and does not measure the exact frame of first paint.

With the current build, the same 106,402-character JavaScript source, and ordinary
phase checkpoints, adjacent native/guest/guest/native runs showed:

| Guest location | Default foreground budget | Test-only 5 ms budget |
| --- | --- | --- |
| First-page keys | 28–104 ms | 18–29 ms |
| First-page parse-ready wait after typing | 2–4 ms | 143–144 ms |
| Last-page keys | 34–48 ms | 18–28 ms |
| Last-page parse-ready wait after typing | 1,835–1,872 ms | 2,039–2,090 ms |

These are individual observed ranges, not a performance guarantee. Native keys
remain faster; the native first-page control took 5–10 ms. Both configurations
pass the same text and eventual viewport-parse assertions. The experiment uses
the existing test-only wrapper around `ParseContext.work` for numeric 20 ms
calls; it does not change idle-worker predicates, event delivery, or production
artifacts. Upstream's two `Work.Apply` call sites are transaction application
and initial language state creation. Explicit parser requests must retain their
own budgets in any proposed build adaptation.

The shorter budget is not shipped. It exchanges blocking time for temporarily
incomplete highlighting; visual checks during typing, not merely eventual tree
readiness, are needed before adopting it. The last-page control already exposes
roughly 1.8 seconds of post-input parser catch-up, which the old first-page-only
diagnostic did not measure. Evidence is under `/root/macchiato-work/` in
`first-page-budget{5,-control}` and `last-page-budget{5,-control}`. The live site,
Bunny archive, runtime, and host permissions are unchanged by this experiment.
