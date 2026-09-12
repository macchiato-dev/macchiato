# Native intersection observations

CodeMirror uses IntersectionObserver for editor visibility, viewport gaps and
tooltips. An always-visible timeout shim cannot supply those transitions.
The host now creates the observer in the granted document's realm and forwards
native entries. Entry fields are read lazily; retaining an entry preserves the
browser's snapshot even after layout changes.

The bridge supports null/element roots, root margins and numeric thresholds.
Element roots and observed targets pass the same ownership check as other DOM
operations. Construction accepts at most 1,024 thresholds and a 128-character
margin; at most 1,024 observers may actively observe targets. The browser parses
the margin and computes intersections. No stylesheet, network, navigation or
foreign-node authority is added. Advanced options and document roots are not
part of this first guest adapter.

The native interface and lifetime model are described in the
[Intersection Observer specification](https://www.w3.org/TR/intersection-observer/).
Browser controls remain important: the Chromium probe observes queued records
being cleared by disconnect, rather than assuming callbacks survive it.

## Lifetimes

Construction does not allocate a guest callback slot. First observation does.
While targets are observed, a guest-owned active set retains the observer and
its callback. Removing the last target removes that strong retention, but does
not synthesize disconnect or consume any native queued entries. A still-live
observer may continue to receive them.

The callback registry uses a weak owner for inactive observers. At most four
old subscription records are checked per new subscription, reclaiming dead slots
without a timer or DOM scan. A native callback verifies its observer still has a
guest lease before delivering; a callback cannot reach a recycled slot after
that observer is collected. Explicit disconnect releases its slot immediately.
Machine destruction disconnects all active native observers.

MicroQuickJS's existing minimal platform does not implement Object.freeze.
Threshold getters therefore return separate copies so mutating one cannot alter
the observer's stored configuration. QuickJS additionally freezes these copies.
This does not claim full FrozenArray or general WebIDL conformance.

## Tests

`packages/project-editor/test/intersection-observer.browser.test.js` compares
native, MicroQuickJS and QuickJS behavior in direct and iframe pages: clipped
visibility, thresholds, unobserve/re-observe, disconnect/re-observe, normalized
configuration, empty takeRecords, and retained entry snapshots. The MicroQuickJS
cases collect 300 temporary observers per page without growing host leases;
callback slots remain bounded. An observed instance with no application-held
reference still receives its callback and can disconnect itself.

`packages/project-editor/test/pane-resize.browser.test.js` also moves the real
CodeMirror pane offscreen and back without input, scrolling or a window resize.
Native CodeMirror keeps its last measured inView value while offscreen; the test
checks its intersection flag and its visible state when the pane returns.
No special editor redraw or altered scheduling policy was added.

The rebuilt `4631446` export passes 40 runtime/editor regression tests and 23
reference-scope tests. The latter bypass the facade and attempt to use a foreign
node as an observer root or target; both operations are rejected. Its full
editor stress test passes in 70 seconds, including repeated edits, undo/redo,
scrolling, theme changes, output-error recovery and saved-project reload. The
106 KB paste takes 0.93 seconds and native insertion takes 23.1 seconds; this
correctness change is not a typing-speedup claim. Light/dark and narrow-pane
screenshots were inspected.

All 152 deployment manifest entries verify, and the compressed backend executes
its routing/document guests in Deno. Evidence is under
`/root/macchiato-work/native-intersections-*` and `intersection-*`. Local release
and saved-project checks are recorded in [project page machines](project-page-machines.md).
