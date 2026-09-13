# CodeMirror typing: parser readiness and view updates

## Packaged language-loading audit: 2026-09-13

The project-page regression now creates a disposable multi-file project and
opens all twelve shipped parser packages through the real file chooser. It
checks one initial HTML download, no download for plain text, a shared
JavaScript/TypeScript download, and Python retry after an injected HTTP 503.
Rust is held back while typing and switching to JavaScript; its eventual
arrival must preserve edits, undo/redo, the active language, and editor identity.
The allowed grammar names and bytecode installation boundary are unchanged.

The audit found two omissions, fixed in the `96ec43a` export:

- Language-download failures escaped to the outer page instead of reaching the
  editor's notice area. The notice now stays in the editor guest and describes
  unavailable highlighting rather than a stopped machine. Editing still works.
- The custom theme omitted boolean/null/atom tags and Markdown formatting.
  Those use the existing palette and ordinary CodeMirror highlighting rules,
  not a new parser or host-side coloring. The test checks actual computed token
  styles in light and dark mode. Screenshots were visually inspected.

The packaged language scenario passes in 9.3 seconds; the broader editing
workflow passes in 106.6 seconds. Its 106,432-character paste took 157 ms and
the artificial native insertion took 28.9 seconds. These measurements do not
establish a speedup and leave the large-insertion/layout investigation open.
Both stamped/downloaded runtime language tests and the four light/dark initial
output grant cases pass (seven checks including the parent case).

The screenshots also expose an outstanding UI issue: after opening many files
from the chooser, the selected tab can be offscreen and the scroll arrows do
not appear. `renderTabs()` does not update overflow after that path; observing
the strip's size alone does not observe growing scroll content. Keep this in
the release audit rather than treating the successful grammar tests as a
complete project-page UI check.

Evidence lives under `/root/macchiato-work/language-theme-*`, with the failure
notice baseline in `language-notice-before.log` and the missing JSON boolean
style captured in `language-recovery-browser.log` before the theme fix.

Read-only exported and live project checks pass for full-height Mahjong, Cat
Memory's eight pairs/reset, 50 successive tour slides, and SQLite fragments.
Seven principal assets served on port 3030 match the export byte-for-byte.
Only the editor guest changed among those assets (1,581,624 bytes, 920 larger);
the machine host, controller, and output runtime are unchanged. Both the export
and extracted archive pass all 152 manifest checks, and the compressed backend
artifact executes its routing, document, and SQL-policy guests in Deno.

The locally installed `/root/resources-bunny.tar.gz` has SHA-256
`71f6ec2a58efe3863c65b0ba33995b88d4f8c13fd1bb34e5b2a33823502d2c7c`.
Its predecessor is preserved at
`/root/archive/2026/09/13/resources-bunny-9236700-before-language-theme.tar.gz`.
No owner project was saved and nothing was deployed to Bunny.

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

The default three-input-path regression passes in 47.9 seconds, and the final
last-page/checkpoint regression passes in 10.0 seconds. The result field is
named `viewport-parse-wait` to distinguish readiness from actual painted syntax;
the initial experiment artifacts used `viewport-highlight-wait` for that same
readiness check. No visual-equivalence claim follows from those timings.

## Visual fixture fidelity

`MACCHIATO_TEST_VISUAL_INPUT=1` records each native/guest run as a WebM, samples
rendered line text and span classes on animation frames, and saves an ending
screenshot. It requires `MACCHIATO_TEST_ARTIFACTS`. Keys are spaced by 100 ms in
this mode. Frame sampling and recording add work; these runs must not be mixed
with ordinary latency measurements.

This exposed two deficiencies in the old isolated fixture. It supplied only
foreground/background/caret variables, leaving syntax colors unresolved; it
now reads the actual Resources light palette from the site source, failing if
that declaration moves. Also, this Fedora container lacked a monospace font:
`fc-match monospace` returned proportional Noto Sans. Installing Fedora's
`dejavu-sans-mono-fonts` corrected the environment. The fixture now reports
measured widths of `iiii` and `WWWW`, and visual mode requires equal widths.
Neither change expands the machine's authority or changes production assets.

Earlier timing comparisons used identical fonts in their native and guest
runs, but their absolute timings and wrapping are not interchangeable with
this corrected setup. New baselines must use the corrected palette and font.
Before correction, screenshots cannot establish visual syntax fidelity even
where recorded spans and parser trees were correct.

## Rebuilt foreground allowance

The Resources editor build now changes just the two upstream `Work.Apply`
constants from 20 ms to 5 ms. The adaptation checks both call sites and fails
on an incompatible upgrade or duplicate application. It does not wrap runtime
methods, alter explicit `ensureSyntaxTree` budgets, change idle-worker slices,
or change tree publication. The generated editor source differs on exactly
those two lines. Its Wasm shrinks by eight bytes to 1,579,016 bytes.

Fresh comparisons use the corrected font/palette and a control extracted from
commit `782eb23d`, with identical current runtime, language source, source text,
input sequence, and viewport. Each condition runs native/guest/guest/native.
First-page guest keys measured 16–43 ms in the candidate versus 27–91 ms in the
control; last-page keys measured 16–32 ms versus 35–46 ms. Post-input viewport
parse waits were 7–103 ms versus 2–102 ms on the first page, and 2,112–2,334 ms
versus 1,830–1,863 ms on the last page. These observed ranges are not latency
guarantees. Deferred highlighting remains a real cost, not a completed feature.

Separate rebuilt visual runs sample an unchanged import line: it acquires its
final spans after 128–129 ms and does not lose them during the remaining edits.
Ending screenshots were inspected. This supports stable highlighting for that
sample, not a claim that every editing pattern is flicker-free. Recordings and
frame data are under `foreground-parsing-rebuilt-visual`; ordinary comparisons
are `foreground-parsing-{candidate,control}-{first,last}` beneath
`/root/macchiato-work`.

All 394 editor/runtime tests pass. The full Resources workflow passes in 72.3
seconds, including repeated invalid font edits, live-output interaction during
rejection, recovery without reload, undo/redo, scrolling, themes, disposable
save/reload, phone views, and large input. No host permission or runtime API is
added by this change.

## Shorter pauses between idle slices

The build now also changes the two `Work.MinPause` constants from 100 ms to
25 ms. This changes how long the worker waits before requesting an idle slice,
not its parsing algorithm, slice allowance, publication, or input handling.
The combined timer/idle-callback maximum remains 500 ms, as does the timer-only
fallback. Browser cancellation and the upstream input-pending check remain
unchanged. A build test reverses the two replacements and compares the entire
result to the installed upstream source; incompatible upgrades fail the build.

Last-page comparisons use the same 106,402-character JavaScript file, corrected
monospace font/palette, 585px editor, and native/guest/guest/native order. The
control already includes the 5 ms foreground allowance. Its guest post-input
parse waits were 2,176 and 2,124 ms, versus 1,287 and 1,331 ms with shorter idle
pauses. Final checkpoints report approximately 1.0–1.1 seconds of inclusive
parser work in both conditions. Shorter sleeps reduce elapsed catch-up time;
this is not a faster parser or a whole-application speedup claim.

The queued-input diagnostic now sends its ten letters *before* waiting for
viewport parsing to finish. Both guest runs confirm that parsing was still
incomplete before the burst. Candidate acknowledgements were 16–24 ms, versus
16–24 ms in the control, with exact resulting content checked. This probes
input during catch-up; the former placement after readiness did not. It does
not establish responsiveness under every load or browser scheduler.

The experimental candidate and rebuilt editor JavaScript have identical SHA-256
`4230dbfb4269cc5d6d494f1d2517cf19261f5377a9cd02c621617a1a130f4614`.
The generated source changes only those two idle constants. Core bytecode stays
979,732 bytes and editor Wasm stays 1,579,016 bytes. All 395 tests pass, as does
the 72.4-second Resources editing/recovery workflow. No host/controller or
permission change accompanies this adaptation. Measurements are under
`/root/macchiato-work/`: `parser-pause-control`, `parser-pause25-candidate`,
and `parser-pause-burst-{candidate,control}`; logs use the same prefixes.
Remaining parser work and native-document fidelity issues are still open.

A final recorded run uses the rebuilt source, last-page typing, and the queued
burst together. Exact input and eventual parsing pass; inspected ending
native/guest screenshots agree in wrapping, gutters, and visible syntax. Frame
samples for the unchanged `button.textContent` line reach their final spans
at 2,688–2,782 ms in the guest, versus 79–84 ms natively, and do not lose them
afterward. These times start at the beginning of the recorded input sequence,
not after its final key, and include recording/sampling overhead. They are not
the ordinary post-input waits above. The visible delay is still substantial;
matching final screenshots do not make the whole interaction native-speed.
Recordings, frame data, and screenshots are in `parser-pause-rebuilt-visual`.

## Retaining work between keys

The optional `MACCHIATO_TYPING_PROFILE_CATCH_UP=1` capture continues through
viewport parse readiness instead of stopping at the final key. It requires
the typing-profile directory and checkpoints. The two guest captures account
for about 63–65% of sampled elapsed time beneath idle-parser callbacks and
4–5% beneath the Wasm/JavaScript bridge; these are inclusive samples, not
additive categories. Most remaining work is guest execution, not host DOM
dispatch. Evidence is in `parser-catch-up-profiles` under the work directory.

`MACCHIATO_PARSE_PROGRESS=1` adds bounded numeric snapshots around parser work
and edits: current progress, published tree length, and reusable fragment
ranges. It does not retain contexts or trees. `MACCHIATO_TEST_KEY_INTERVAL=100`
allows human-paced input without video/screenshot overhead; it is the delay
after each acknowledged key, not an independently queued input cadence.

This reveals lost work in installed CodeMirror language 6.12.4. Its `changes`
method snapshots fragments before calling `takeTree()`. With last-page edits
100 ms apart, the pending parse reaches roughly 13–16 KB and finalization
publishes those fragments, but the next state receives the earlier roughly
1.2 KB snapshot. The following key repeats much of that work. The test-only
candidate moves finalization before the snapshot, leaving the existing
change-range invalidation intact. Its successive states retain progress at
about 16, 29, 37, 46, 56, 64, and 73 KB in one recorded diagnostic.

Both conditions use the same 106,402-character JavaScript file, 585px viewport,
eight-key sequence, and native/guest/guest/native order. Post-input waits were
1,152–1,160 ms in the control and 400–411 ms in the candidate; inclusive parser
work fell from about 1,623–1,628 ms to 1,042–1,060 ms. These are diagnostic
ranges, not latency guarantees. Rapid typing without idle time between keys
does not necessarily offer the same opportunity to preserve work.

Twenty deterministic tests use the actual parsers and compare node names
and ranges against fresh parses. They prove the installed version loses newly
published fragments and the candidate retains them, then check append, interior
edit, deletion, full replacement, and no-op transactions in JavaScript, JSON,
and HTML, including malformed input, simultaneous changes, and Unicode. A
no-op must retain the newly finalized partial tree before any further work.
The guarded build adaptation reverses to
the complete original source. Logs and data are in `parser-fragment-progress`,
`parser-fragment-paced`, `parser-fragment-retained`, and `parser-fragments-unit.log`.

The rebuilt editor exactly matches the experimental candidate (SHA-256
`39cd87e032a8d9dacc539df408d5c98d3ae5fcb96d165249ddc959375d311356`).
Its only generated-source difference is the moved `takeTree()` call. Core
bytecode and Wasm sizes remain 979,732 and 1,579,016 bytes. All 415 editor/runtime
tests pass in 166.2 seconds; the matched export verifies 152 files and runs its
compressed backend in Deno.

The rebuilt last-page recording includes human-paced keys and the queued burst.
Input and eventual parsing pass. The unchanged sample line reaches its final
spans 1,734–1,757 ms after recording starts, versus 2,688–2,782 ms in the prior
recording; neither guest run subsequently loses those spans. Native runs remain
much quicker, at 96–99 ms. The ending guest screenshot was inspected. These are
recorded-sequence times with diagnostic overhead, not post-input latencies or
proof of native-speed editing. Evidence is in `retained-fragments-visual`.
The full Resources workflow also passes in 73.9 seconds, including repeated
invalid font edits, recovery without reload, undo/redo, scrolling, themes,
disposable save/reload, phone views, and large input. The recovered-output
screenshot was inspected. The live server/archive are not updated by these
checks alone; saved-project and final live-asset verification remain release
gates. The production document-fidelity failures are unrelated and unresolved.

## Shipped-runtime input comparison: 2026-09-12

The comparison now defaults to re-stamping the shipped
`generated/project-editor-quickjs-runtime.wasm`, rather than the mutable Cargo
`target/` output that an unrelated demo build can replace. Explicit runtime
overrides still support experiments. Both files' code sections match in this
checkout (166,142 bytes; SHA-256
`336ec25eb3954548d0ec247837c9c7cfa8df041d349ee2347fc49948733dd636`).
Thus this corrects the baseline's provenance, not measured runtime performance.

A fresh native/guest/guest/native run uses the retained 106,402-character real
JavaScript source, the 585px pane, production core/language sources, and the
existing lightweight phase checkpoints. It records:

| Operation | Native | MicroQuickJS |
| --- | --- | --- |
| CodeMirror paste | 24–29 ms | 79–81 ms |
| Chromium multiline `insertText` | 5,694–5,742 ms | 6,357–6,567 ms |
| Individual first-page keys | 5–15 ms | 16–27 ms |
| Viewport parse wait after typing | 4–5 ms | 101–114 ms |

Both multiline insertion paths deliver 3,868 native input events and one
application change notification, with exact text checked. Paste emits one
application change notification as well. Undo/redo, eight ordinary keys including
a typo/correction, and eventual highlighting pass. These are two samples per
engine with checkpoint/Playwright overhead, not latency guarantees or an
unprofiled before/after speedup comparison.

The full Resources stress test's roughly 14-second native insertion should not
be described as ordinary paste performance. That fixture also has the website
layout, output rebuild, and an enormous HTML comment around its source. The
isolated native control confirms a large browser-side cost even without those
differences. No input interception, dropped events, or disabled highlighting
is justified by this measurement. Guest catch-up and application-scale costs
remain visible rather than being removed from the test.

Evidence is in `/root/macchiato-work/shipped-runtime-input/` and its sibling log.
Only the diagnostic default changes; the live site and Bunny archive are
unchanged by this checkpoint.

A separate recorded first-page run uses paste only and 100 ms between keys.
Exact edits and eventual parsing pass. Its ending native/guest screenshots were
inspected and agree in wrapping, gutters, visible highlighting, and completion
placement. The unchanged second import line reaches its final spans after
126–129 ms in the guest, versus the initial sampled frame natively; none of
the remaining sampled frames loses those spans. This is one selected line,
not a universal flicker assertion. Videos, frame samples, and screenshots are
under `/root/macchiato-work/shipped-runtime-visual/`. Recording/sampling adds
overhead, so its timings are not mixed with the preceding comparison.

## Rendering-document comparison: 2026-09-13

`MACCHIATO_TEST_RENDER_FRAME=1` now runs the same bulk-input benchmark inside
an iframe document. Both native CodeMirror and MicroQuickJS use that document;
only trusted fixture/runtime code executes there, while inserted source remains
editor text. The default still uses the original top-level document. Geometry
records include `renderFrame`, and input/checkpoint reads use the actual editor
realm. This is test support, not a production editor-frame integration.

The first experiment uses the retained 106,432-character HTML-comment fixture,
a 585 × 844 editor, and the same `13px / 18.2px monospace` font. Each condition
runs native/guest/guest/native with warmup, without video or profiling. A direct
control, iframe condition, then repeated direct control give these ranges:

| Chromium bulk replacement | Native | MicroQuickJS |
| --- | --- | --- |
| Direct control | 8.99–9.24 s | 9.67–10.58 s |
| Iframe document | 6.73–9.79 s | 8.77–10.60 s |
| Repeated direct control | 6.58–6.63 s | 7.48–7.59 s |

Every case delivers one beforeinput event, 3,874 input events, and one change
notification. Exact source, paste, undo/redo, and typo/correction all pass.
The variation does not establish a frame speedup. This isolated fixture also
does not reproduce the surrounding Resources workspace, so it cannot rule out
benefits from isolating that page's larger layout/style dependencies. There is
no basis here for changing native input semantics or silently adopting a new
production frame hierarchy.

A second recorded comparison uses the 106,402-character raw JavaScript source,
the JavaScript language module, paste, and keys 100ms apart. Guest paste takes
83–93ms in the frame and 86–91ms directly; individual guest keys take 22–54ms
and 22–59ms respectively. Native keys are 6–20ms and 5–22ms. These include
Playwright/recording overhead and are not latency guarantees. The unchanged
second import line reaches its final spans at 131–138ms in the iframe and
132–138ms directly, measured from the start of sampled input. It never loses
those spans in the remaining samples; native samples already have them.

Ending native/guest screenshots match in wrapping, gutters, highlighting, and
completion placement. Directly decoded video frames also show the edits. A
browser-based video-seeking helper initially returned a stale frame; that image
is explicitly named `stale-seek-not-evidence.png`, and was not used as evidence
of editor behavior. Playwright's bundled FFmpeg decoded the actual recording
correctly at 0.8, 1.4, 2.0, and 2.8 seconds.

Evidence is in `/root/macchiato-work/editor-frame-{control,isolated,control-repeat}`
and `editor-frame-real-js{,-control}`, with matching sibling logs. The test and
documentation are committed; the live site and verified Bunny archive are
unchanged. Application-scale layout costs and the broader completion audit
remain open.

## Full workspace rendering-document control: 2026-09-13

The isolated-page test above did not include the Resources stylesheet. The
benchmark now accepts `MACCHIATO_TEST_WORKSPACE_PAGE`, a saved anonymous
`/try?template=article` response. It removes application scripts and mounts only
the measured editor. Header, toolbar, details, layout, and their stylesheet stay
present. Neither the outer application nor output guest executes. This isolates
the surrounding DOM/CSS dependency, not total live-project performance.

The script-stripped shell SHA-256 is
`c0296dd36442d8a16d82f0bea9779cc5bc64cecf1fec66d5d123080a7b026461`.
Both rendering modes measure 585 by 798 pixels with the same 13px monospace font,
18.2px line height, and light syntax palette. Each condition runs native,
MicroQuickJS, MicroQuickJS, native, with warmup and no profiling or recording.

| 106,432-character bulk replacement | Native | MicroQuickJS |
| --- | --- | --- |
| Workspace, direct | 11.32–11.58 s | 12.10–12.17 s |
| Workspace, iframe | 5.68–5.96 s | 6.72–6.74 s |
| Workspace, repeated direct | 11.16–11.36 s | 12.13–12.22 s |
| Workspace, 15 narrowed layout selectors | 10.56–10.93 s | 12.07–12.08 s |

The optional selector control rewrites broad `:has()` descendants to direct
children where the workspace structure permits it. It does not recover the
iframe benefit and has not been adopted in production. The test flag remains
`MACCHIATO_DIRECT_LAYOUT_SELECTORS=1` for reproducibility.

All cases preserve one `beforeinput`, 3,874 `input` events, one application change,
exact contents, undo/redo, and typo/correction. The shared native improvement
points to a browser DOM/style/layout cost rather than an interpreter-only cost;
it does not identify a specific expensive browser operation. These unusual
native bulk replacements are not the ordinary paste-handler path.

Separate recorded runs use the raw 106,402-character JavaScript file and its
language module, with 100ms between keys. Before the fixture-theme correction,
direct guest paste is 91–92ms and framed paste 82–93ms. Guest keys are 17–74ms
directly and 21–66ms framed; native keys are 5–13ms and 4–25ms. This does not
establish an ordinary-typing speedup. Video and frame sampling add overhead;
do not combine these numbers with the unrecorded bulk results.

Screenshot review caught that the fixture supplied light CSS variables without
calling the editor's theme API. It now sets the light theme before mounting in
both native and guest cases. Visual runs additionally open Find, type a query,
retain search focus, dismiss with Escape, scroll to the end, and return to the
first line. This is test-fixture correction, not a production theme change.
The frame still needs the workspace's search-control CSS explicitly supplied
before integration; inherited parent-document selectors do not cross the frame.

Artifacts are retained under `/root/macchiato-work/workspace-input-*` and
`workspace-typing-{direct,frame}{,-ui}`, with sibling logs. This response fixture
is not a source asset and is not committed. Tests and findings are checkpoints;
the live site and Bunny archive remain the verified `398f759` build.

### Integration boundary

An editor frame must not expand the current machine's DOM grant across two
documents. The present editor machine contains both project UI/history and
CodeMirror. The next integration experiment should separate CodeMirror into its
own guest/session and DOM device rooted in the editor frame, with the controller
relaying explicit editor commands and changes. The project UI keeps ownership
of history, files, output, and status. Source text remains data, never host code.

Preserve synchronous command results where callers rely on them; do not change
native editing events into asynchronous messages. Verify file switching and
undo history, lazy language loading, repeated theme changes, focus/shortcuts,
search/completion geometry, resizing, and disposal with the real project UI.
Keep the no-frame path available. The benchmark alone is not evidence that this
integration is implemented or that its lifetime and containment checks pass.

### Opt-in editor-surface implementation: 2026-09-13

`ResourcesEditorDevice.mount({ editorFrame: true })` now creates a separate
MicroQuickJS editor machine rooted in a trusted frame Document. The project UI
machine retains files, history, and output ownership. Its editor commands cross
an explicit synchronous application interface; native editing events stay in
the editor's own document. The default remains the direct editor. This is not
yet enabled in the live site or the verified Bunny archive.

Two integration details mattered:

- Constructing the machine bridge in the parent realm while granting a frame
  Document produced observer records from the wrong realm for existing host
  checks. The trusted frame controller now constructs the bridge locally.
  `structuredClone` gives it a realm-local wrapper for the already compiled
  WebAssembly module; it does not download or compile the interpreter again.
  No machine permissions or observer allowlists were expanded.
- MicroQuickJS's named-call packet does not return the JavaScript function's
  result. The application bootstrap explicitly sends its existing response
  message, keeping that convention out of the interpreter. The project UI
  receives values, never cross-document DOM references.

The rebuilt editor artifact is 1,586,800 bytes, 3,308 bytes larger than the
verified direct-only artifact. The surface bootstrap is 1,792 bytes within that
artifact; the frame controller is about 9 KB of additional readable JavaScript.
Search controls need their styles inside the frame. Copying only the font
family, rather than a resolved `font` shorthand, preserves the existing 13px
monospace text instead of accidentally enlarging it.

`packages/website/test/project-editor-surface.browser.test.js` checks the
standalone surface and the actual project UI/history guest using the `/try`
workspace DOM and CSS. It verifies native typing and correction, undo/redo,
Find and Escape, repeated light/dark switches, lazy language loading, snapshot
updates, file switching, visible highlighting, and disposal. It also checks
double-start rejection, cancellation during frame loading, unavailable-shell
cleanup, and rejection of commands after closure. Source remains text; the
surface does not expose an eval command. These tests stub output services;
they do not prove the complete outer/UI/editor/output lifetime integration.
All 111 non-browser editor/website tests also pass after rebuilding; their log
is `editor-surface-module-tests.log` in the same work directory.

The same 106,402-character JavaScript source passes through the real project UI
in both modes. Eight first-page keys with a typo/correction, 100ms apart, take
39–78ms framed and 31–58ms directly in this unrecorded run. These are inclusive
Playwright measurements, not a consistent ordinary-typing speedup. The earlier
controlled bulk-replacement comparison remains separate evidence.

Reproduce using `MACCHIATO_TEST_BUILT_RUNTIME=1` and optionally
`MACCHIATO_TEST_SOURCE_FILE`; set `MACCHIATO_TEST_EDITOR_FRAME=0` for the direct
workspace control. Logs are `editor-surface-built-{frame,direct}.log` under
`/root/macchiato-work`, with workspace and search screenshots alongside them.

Before enabling the option, test the complete application, including output,
navigation during loading, layout switches/resizing, and application shortcuts.
Native key events do not bubble out of a frame: the existing command-palette
shortcut needs an explicit application intent, not replayed CodeMirror events
or a wider DOM grant. The controller and deployment export still need a full
rebuild and verification before this becomes the live configuration.

### Complete-site integration checkpoint

The app browser test `Resources framed editor integrates with the site and
running output` now uses an authenticated fixture project, the actual outer
MicroQuickJS guest, project UI guest, separate editor guest, and QuickJS output.
Only the controller's editor-frame option is substituted in the test build;
server routes, resource fetching, compilation, and output are not stubs.
`MACCHIATO_TEST_EDITOR_FRAME=0` runs the same scenario directly.

The first runs found missing integration rather than editor defects:

- The response CSP blocked the new frame shell. Only the two named machine
  shells now allow same-origin ancestors and their fixed inline controllers;
  other documents retain `frame-ancestors 'none'`.
- Site theme events did not reach the framed editor. The outer guest now
  forwards the resolved theme through the controller service, and startup
  reads the current theme. This also sets the direct editor's theme facet.
- Ctrl-K in the frame could not reach the site's command palette. The editor
  guest emits a specific shortcut intent, which reaches the outer guest's
  existing palette function. Native CodeMirror events are not replayed.
- Leaving during a runtime download logged the departed page's cancelled
  fetch as a live failure. Controller teardown now begins with the initial
  download, disposes discarded documents, and retains BFCache documents.
  Editor starts coalesce; stale workspace replies and pending output mounts
  cannot become the new active session after disposal.

The complete-site scenario checks corrected typing, actual output replacement,
output state across file switches, repeated system-theme changes, pane modes,
window resizing, expanded output, palette activation without editing source,
navigation/back, and leaving while the editor download is held. Sampled paints
show no mismatched editor background during its theme switches. BFCache
retention is the lifecycle policy; these runs do not establish that Chromium
actually chose BFCache rather than reloading on Back.

The direct-editor regression suite passed eight startup/theme combinations and
the long editing/save/history/recovery scenario, then exposed a capacity
regression: the new bootstrap plus all lazy grammars required 17 bytecode
program slots, but the runtime had 16. Its descriptor table now has 32 entries;
the 32 MB JavaScript arena and 4 MB bytecode-storage budget are unchanged.
The artifact test counts bootstraps and distinct grammar packages against the
declared capacity. Parser failures also retain their actual reason in the UI.

Two subsequent complete language runs passed, including Svelte, retries,
Markdown/JSON themes, and file-strip scrolling. One intervening run timed out
while revealing the selected tab after repeated closes. That intermittent
visibility failure is not declared fixed; the test now records tab geometry
and a screenshot when it occurs. It remains part of the next integration audit.

Evidence is in `/root/macchiato-work/editor-surface-full-site*.log`,
`editor-surface-direct-regressions.log`, `editor-surface-languages-fixed*.log`,
and the full-site screenshots. The updated editor WASM is 1,587,348 bytes;
the frame controller is 9,120 bytes. The option remains off in production,
and the live controller and `/root/resources-bunny.tar.gz` still match the
verified `398f759` export. Default activation and packaged verification remain.

Final rebuilt-artifact checks pass in both complete-site modes, the separate
106 KB editor test, all 112 editor/website module tests, and 11 edge-policy
tests. Their logs use the `editor-surface-full-site-final-*`,
`editor-surface-final`, `editor-surface-integrated-module-tests`, and
`editor-surface-edge-policy-tests` names in the same work directory.

### Default framed-editor checkpoint

The source controller now defaults to `editorFrame: true`; its explicit false
option retains the direct surface. The complete-site test still exercises both
options, while the general UI suite now targets the default frame's editor.

The framed suite passed startup and navigation appearance in eight desktop and
phone combinations, and the long editing/history/output-recovery scenario.
The latter includes 80 edits, undo/redo, scrolling gutters, repeated font-edit
recovery, and a 98 KB native insertion (5,087 ms in this run). This timing is
not a replacement for the controlled native/guest comparison above.

A deliberately failed Python grammar download exposed one missed boundary:
the editor surface treated the recoverable language notification as a machine
error. It now forwards that notification to the project UI's existing warning
and retry behavior. The complete language test passes after rebuilding, without
replacing the editing session. Five further direct tab-strip stress runs also
passed; the earlier intermittent visibility failure remains documented rather
than attributed to a speculative fix.

Evidence: `editor-frame-default-ui.log`, `editor-frame-language-retry.log`,
`editor-frame-default-ui/`, and `editor-tabs-repeat-{1..5}.log` under
`/root/macchiato-work`. Light editor and history screenshots were inspected.
At this checkpoint the local 3030 server and deployment archive still use the
previous export; packaged verification precedes activation.

### Packaged and live activation

Export `resources-co-c671ef9` then passed all 12 packaged browser checks and
112 editor/website non-browser tests. The 98,547-character native insertion
took 5,512 ms in the packaged stress run; its ordinary paste path took 123 ms.
No input semantics were suppressed to obtain that result.

The local 3030 server was restarted with this build. Eight principal assets,
including both frame shells, match the export by SHA-256. Read-only owner
checks passed for 144 Mahjong tiles, all eight Cat Memory pairs and reset,
50 tour slides plus embedded/expanded keyboard navigation, SQLite fragment
navigation, and phone/desktop pane and theme changes. No owner source or notes
were saved. Desktop Mahjong and phone Cat Memory screenshots were inspected.

All 153 deployment files verify before and after tar extraction, and the
compressed backend runs its routing, document, and policy guests under Deno.
`/root/resources-bunny.tar.gz` now contains this export; the previous archive
is retained under `/root/archive/2026/09/13/`. Nothing was deployed to Bunny.
Logs and screenshots use the `editor-frame-packaged-ui`, `editor-frame-live`,
`editor-frame-modules`, and `editor-frame-bunny-backend` names in the work
directory. The earlier intermittent tab-strip timeout remains an open
observation, despite the subsequent passing runs.

### Reproduced tab-strip and callback-lifetime failures

Repeatedly reopening and closing the language fixture at 1000 and 1440 pixels
reproduced the tab-strip failure. Its right arrow had been inserted after all
the toolbar controls, so overflow measurements included unrelated controls.
The guest's `after()` used its private lifetime mirror for sibling order;
adopted DOM nodes enter that mirror on demand, not in document order. It now
uses the actual `parentNode` and `nextSibling` reads. The host is unchanged.
An explicit adjacency assertion fails against the old runtime.

Longer runs then reached callback IDs above 2047. WebAssembly delivers their
packed words as signed i32 values; the guest decoded them as negative callback
indices. Dispatch now normalizes the word to unsigned after recognizing the
flush sentinel. A real browser-timer regression fails before this fix and
passes afterward for slots 2047, 2048, and 4095.

Tab rendering also hid old tooltips without unregistering their listeners.
Replaced tabs now dispose tooltip timers and listeners, returning their slots
through the existing guest unsubscribe path. Eight full open/close cycles,
alternating viewport widths, pass without increasing the 4096-slot limit.
This is explicit component cleanup, not a new policy that invalidates every
detached DOM node or a claim about arbitrary guest listener cycles.

The separate editor test now loads, inserts, and pastes source containing
scripts, remote images, styles, frames, and refresh metadata. The content stays
exact source text, creates no such elements, triggers no unexpected requests,
and does not navigate. All 25 callback/surface/initial-output browser checks
pass with these source artifacts. Evidence is in `editor-tabs-cycles.log`,
`editor-tab-sibling-before.log`, `callback-word-before.log`,
`callback-word-after.log`, `editor-tabs-lifetime.log`, and
`tab-lifetime-boundaries.log` under `/root/macchiato-work`.

Commit `f9ce2373` contains these fixes. Packaged verification is separate from
the focused tests above; the preceding live/export record still applies until
the rebuilt deployment is checked and activated.

The `f9ce237` export subsequently passed all 12 packaged application browser
checks (including eight tab cycles), 112 non-browser checks, the Deno backend
test, and all 153 deployment-file checks before and after archive extraction.
The narrow overflowing-tab screenshot was inspected: the arrows flank the
strip, with file/history controls remaining outside it. Native bulk insertion
of 98,905 characters took 5,345 ms; the ordinary paste path took 129 ms.

After restarting the local server, eight principal live assets match the
export by digest. Read-only owner checks again passed Mahjong, all Cat Memory
pairs/reset, 50 tour slides and keyboard navigation, and SQLite fragments,
including phone/desktop theme and pane switches. No owner project or notes
were saved. `/root/resources-bunny.tar.gz` now holds this export; the preceding
archive is preserved under `/root/archive/2026/09/13/`. Nothing was deployed to
Bunny. Evidence uses the `tab-lifetime-packaged`, `tab-lifetime-modules`,
`tab-lifetime-live`, and `tab-lifetime-bunny-backend` log prefixes.

### History-list callback lifetime

A disposable project with 64 saved snapshots reproduced another listener
lifetime issue: repeatedly opening history rebuilt all rows and registered new
guest callbacks without unregistering the discarded rows. The original version
exhausted the 4096 callback slots during an 80-open test. The failure is recorded
in `history-lifetime-before.log` under `/root/macchiato-work`.

The persistent history list now owns one delegated click listener. Each row
holds its action only as a guest-side property, so replacing rows does not
allocate new host subscriptions. This covers saved snapshots and session-draft
history without changing their selection or publication behavior. It is an
application cleanup fix, not a change to arbitrary detached-node lifetimes.

The 80-open test passes, including clicking the nested text of version 1,
replacing the output, and continuing to edit. The first ten openings measured
69–105 ms and the last ten 83–97 ms in this run; these are diagnostics, not a
controlled benchmark. The separate long-editing test also passes selection,
republishing an older version, undo/redo, repeated invalid/valid font edits,
theme changes, and bulk insertion. Evidence: `history-lifetime-actions.log`.
Commit `9fdadc55` contains the source fix and regression. Packaged and live
verification follows separately.

The first packaged run passed 11 of 12 checks but failed the bulk insertion's
unchanged-pane-size assertion after a phone/desktop switch. A focused rerun
instead failed at recovery: the test injected a pending snapshot directly into
session storage while the application's preceding edit could still be saved.
Recovery is now exercised by an actual editor change before reload, avoiding
that out-of-band race. The next focused run passes both recovery and pane-size
checks. The original size mismatch has not been independently explained;
the assertion remains intact with rectangle/status diagnostics and a failure
screenshot. Logs: `history-lifetime-packaged.log`, `history-lifetime-layout.log`,
and `history-lifetime-layout-recovery.log`.

The final full packaged run passes all 12 checks, including the unchanged size
assertion, 80 history openings, eight appearance combinations, and language/tab
cycling. Its ordinary paste took 122 ms for 99,199 characters; native insertion
took 5,562 ms for 99,225 characters. All 112 non-browser checks and the Deno
compressed-backend test pass too. The recovered-draft change and diagnostics
are in test-only commit `1c7fda10`; deployed source remains `9fdadc5`.

The local server now serves this export: eight principal assets match by
digest, and read-only owner checks passed Mahjong, all Cat Memory pairs/reset,
50 tour slides and keyboard navigation, and SQLite fragments. History, light
editing, and desktop Mahjong screenshots were inspected. No owner project or
notes were saved. All 153 deployment files verify after tar extraction.
`/root/resources-bunny.tar.gz` contains this export, with its predecessor under
`/root/archive/2026/09/13/`; nothing was deployed to Bunny. Evidence uses the
`history-lifetime-packaged-final`, `history-lifetime-modules`,
`history-lifetime-live`, and `history-lifetime-bunny-backend` log prefixes.

### Responsive geometry follow-up

A focused anonymous Article test now performs 20 phone-to-desktop transitions,
alternating 1000- and 1440-pixel desktop widths and pasting an approximately
81 KB inert document after each transition. All 20 preserve the editor's exact
rectangle: 365 or 585 pixels wide and 798 pixels high. It samples the baseline
after the existing view/visibility signals, without adding an arbitrary settle
delay. On failure it records every measured rectangle and a screenshot.
Source regression: `5c86ae54`; evidence: `responsive-geometry.log` under
`/root/macchiato-work`.

Two additional complete long-editing runs pass recovery, history selection and
republishing, invalid/valid CSS updates, phone/desktop views, paste, native bulk
insertion, undo, and redo. Logs: `responsive-long-1.log` and
`responsive-long-2.log`. These runs do not explain the earlier one-off size
failure; its diagnostic assertion remains, and no speculative application
layout change was made.

The current runtime also passes 238 browser assertions/subtests across eight
caret, pane-resize, document-realm, media-query, inherited-markup, reference,
range, and mutation-scope suites. These include native/guest caret blink and
trusted text dragging, not just synthetic selection calls. Evidence:
`editor-current-behavior-boundaries.log`. This is a test-only checkpoint; the
local application and deployment archive remain the verified `9fdadc5` build.

### Runtime transfer compression

The local static path was returning runtime and bytecode files without HTTP
compression. `withCompressedArtifacts` now prepares gzip variants for static
`resources-site` JavaScript, WASM, and bytecode files. Export and local preview
share this function, using the built-in Compression Streams API. It does not
compress per request, alter browser URLs, restore caching, or add a decoder to
the frontend controller. HTML and user/API responses are outside this path.

The static handler negotiates gzip, respects explicit refusals, preserves MIME
types, and varies by `Accept-Encoding`. Storage requests ask for identity so
the stored compressed bytes are not confused with transport compression.
The deployment verifier decompresses each variant and checks its size and hash
against the original asset. This follows the standard HTTP deployment pattern
described in the [WebAssembly deployment guidance](https://emscripten.org/docs/compiling/Deploying-Pages.html);
it introduces no Emscripten build dependency.

The first integrated run found that the server machine's document-response
header allowlist rejected `Content-Encoding`. That website route now permits
the header. `Content-Length` remains controlled by the HTTP server rather than
being granted to guest response descriptors; the generic server policy is
unchanged. The direct handler and server-boundary unit checks pass (21 tests).

A real Chromium project-page request then reported these body sizes:

| Asset | Encoded bytes | Decoded bytes |
| --- | ---: | ---: |
| Frontend runtime | 179,899 | 400,132 |
| Build runtime | 1,179,422 | 5,010,038 |
| Editor runtime | 827,293 | 1,588,224 |
| Output runtime | 285,925 | 816,994 |
| HTML grammar | 93,242 | 193,220 |
| Total | 2,565,781 | 8,008,608 |

This is about 68% less transfer, not a measured CPU or end-to-end load-time
speedup. The same test verifies native browser decoding/compilation, HTML-only
initial grammar loading, 80 history openings, and continued interaction.
Evidence is in `compressed-assets-first-fixed.log` and
`compressed-assets-boundary-unit.log` under `/root/macchiato-work`.
Source checkpoints: `ca0558c8` and `781c9c7b`. The previously deployed local
build remains in place until packaged verification finishes.

Export `781c9c7` then passed all 13 packaged browser checks, all 114
editor/website non-browser checks, and the Deno compressed-backend test.
The separate 21-test edge/server-boundary run also passed. Native bulk input
took 8,170 ms for 99,225 characters in this run, while ordinary paste took
140 ms; compression is not being credited with a typing-speed improvement.

The local server now serves this build. Seven compressed executable assets
match the export byte-for-byte, and the live header check preserves
`application/wasm`, `no-store`, and `Vary: accept-encoding`. Read-only owner
checks pass Mahjong, all Cat Memory pairs/reset, 50 tour slides plus keyboard
navigation, SQLite fragments, and theme/pane switches. The Cat Memory screenshot
was inspected. No project or notes were saved. All 171 deployment files verify
after archive extraction, including decompressed equivalence. The refreshed
archive is `/root/resources-bunny.tar.gz`, with its predecessor in the dated
archive directory. No Bunny deployment was performed. Evidence uses the
`compressed-assets-browser-final`, `compressed-assets-modules`,
`compressed-assets-backend`, and `compressed-assets-live` log prefixes.

### Overlap editor transfer with output startup

Cold Chromium checks now measure readiness rather than the load event. With
fresh browser processes, caching disabled, 1,000,000 bytes/second download
throughput and 50 ms request latency, gzip versus identity delivery averaged:

| Project | Identity output/editor (s) | Gzip output/editor (s) |
| --- | ---: | ---: |
| Mahjong | 11.77 / 15.80 | 7.29 / 10.71 |
| Cat Memory | 9.29 / 11.64 | 4.35 / 5.88 |

Each cell averages two runs, ordered identity/gzip/gzip/identity per project.
One unthrottled warmup was excluded. This is a small controlled-network sample,
not a production latency guarantee. Owner requests were read-only; both games
and syntax highlighting were checked. Evidence: `loading-compression-comparison`
under `/root/macchiato-work`.

Resource timings also exposed a serialized editor download: it started only
after output readiness. Starting it alongside the builder improved editor
readiness but competed with the builder for bandwidth. The selected change
starts editor download/compilation after project compilation, overlapping
output startup. Editor execution still waits for the output paint checkpoint.
Both editor contexts share the compiled module. An early download failure is
observed without interrupting output and is rethrown when starting the editor;
closing the project still invalidates its pending mount.

An additional before/after/after/before run used identically built controller
overrides and gzip for both variants:

| Project | Before output/editor (s) | After output/editor (s) |
| --- | ---: | ---: |
| Mahjong | 6.98 / 10.29 | 6.71 / 9.03 |
| Cat Memory | 4.45 / 5.83 | 4.51 / 5.28 |

The output-to-editor gap fell from 3.31 to 2.32 seconds for Mahjong and from
1.38 to 0.78 seconds for Cat Memory. Output timings were mixed; parallel
transfers still share bandwidth, and CPU timing varies. No claim is made that
every pane becomes faster. Evidence: `loading-editor-preload-abba/results.json`,
with screenshots beside it; the earlier candidates use `loading-editor-preload`
and `loading-editor-late-preload`. The failure-path unit suite passes (17 tests).

Export `4d569f7` passes all 115 non-browser checks and the compressed-backend
test. The packaged browser suite passed 12 of 13 checks: the language test
found a machine-error attribute during its deliberately failed Python download.
The test previously reported only the attribute count; it now includes its
value and page errors. Three focused language reruns passed, including retry,
all languages, tab cycling, and undo/redo. The original marker's cause is not
established; no runtime workaround was added or failure assertion relaxed.

All 12 initial-output/lifecycle/live-update browser checks also pass: ordinary
Element and framed output remain supported, replacements preserve the old
session until ready, and guest-directed updates retain state. Evidence uses
`editor-preload-browser`, `editor-preload-language` (plus `-2` and `-3`),
`editor-preload-modules`, `editor-preload-backend`, and
`editor-preload-output-boundaries` logs under `/root/macchiato-work`.

The restarted local server passes the read-only owner checks: Mahjong, all Cat
Memory pairs/reset, 50 tour slides, SQLite fragments, themes and phone layouts.
Desktop and phone Mahjong screenshots were reviewed. Seven executable assets
match the export after HTTP decompression. The 171-file archive verifies after
extraction and is installed at `/root/resources-bunny.tar.gz`; the previous
archive is preserved under `/root/archive/2026/09/13`. Nothing was deployed to
Bunny, and no owner project or notes were saved.

### Dense Babel exception records (2026-09-13)

The intermittent machine-error marker is reproduced, rather than dismissed as
a grammar-recovery flake. Five additional normal-speed language runs passed;
Chromium's 4x CPU slowdown then failed before opening TypeScript, *before* the
intentional Python download failure. The message was an unhandled rejection:
`TypeError: invalid array subscript` in Babel's generated regenerator helper.

The project UI's autosave and ZIP import use async `try/catch/finally` blocks.
Babel creates four-element exception records, then its finally helper assigns
`record[4] = record[5] = undefined`. MicroQuickJS rejects writing slot 5 first
because that creates a hole. The guest build now preallocates the helper's two
private state slots. It uses Babel's helper binding, not a blanket rewrite of
application arrays. It also replaces empty entries within those private records
with explicit undefined values. The host, protocol, and interpreter are unchanged.

The native MicroQuickJS control fails with the original subscript error. After
adaptation, 21 generator cases match native JavaScript: completion, early return,
exceptions, nested finally blocks, suspension within cleanup, explicit iterator
return/throw, and helper-name collisions. These run in the example's test command.
The rebuilt editor changes two table literals and grows by eight bytes.

The browser regression now checks machine health before and after file switches
and explicitly awaits completed autosave. With this checkpoint, the pre-fix
artifact fails at normal speed in 7.8 seconds. The fixed export `4042e11` passes
the complete language lifecycle at 4x slowdown in 70.4 seconds, including parser
failure/retry, all languages, undo/redo, and eight tab open/close cycles. Test
timeouts accommodate the intentional slowdown; assertions remain unchanged or
stronger. All 115 website/editor non-browser tests also pass.

Evidence under `/root/macchiato-work`: `language-recovery-investigation-1` through
`-5`, `language-recovery-slow`, `babel-dense-finally`, `dense-finally-before`,
`dense-finally-slow`, and `dense-finally-modules` logs. The build is undergoing
the full packaged browser check before local activation.
