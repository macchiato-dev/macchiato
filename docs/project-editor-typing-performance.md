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
