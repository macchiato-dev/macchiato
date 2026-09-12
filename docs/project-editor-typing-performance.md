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
