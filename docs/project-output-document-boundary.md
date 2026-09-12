# Project output's rendering document

## Verified mismatch

`ProjectOutput` grants each session an HTML subtree inside an ungranted staging
wrapper. This keeps replacements from touching the current app while their code
and resources initialize, but the subtree is not a separate rendering document.

The browser comparison in
`packages/website/test/project-document-viewport.browser.test.js` runs both the
compiled QuickJS output and original HTML in equal-sized iframes, using the
actual output-frame shell. Its four pending assertions execute as TODOs:
they are **known failures, not passing fidelity checks**.

| Measurement | Native page | Current output |
| --- | --- | --- |
| Root declaration `font-size:20px` | 20px | 20px |
| A `10rem` box at that size | 200px | 160px |
| After changing the root to 24px | 240px | 160px |
| Body margin `2rem` at 24px | 48px | 32px |
| Canvas pixel inside the body margin | App blue | White |

The font declaration survives compilation. The incorrect lengths arise because
`rem` uses the actual document root, not a nested HTML element. See
[CSS font-relative units](https://www.w3.org/TR/css-values-3/#font-relative-lengths).
Propagating an HTML body's background to the canvas is also a document-root
behavior, not ordinary inheritance. See
[CSS canvas backgrounds](https://www.w3.org/TR/css-backgrounds-3/#special-backgrounds).
Copying a background color would not fix sizing, background images, root font
changes, scrolling, or other document-specific behavior.

The isolated fixture has a white backing; Resources Edge correctly establishes
its chosen light/dark backing before guest startup. That loading behavior is
separate from letting the guest body's background paint its canvas afterward.

## Requirements to preserve

- Application JavaScript stays in QuickJS, never the browser realm.
- Keep the persistent outer output iframe and its engine during live updates.
- The old app remains usable until its replacement is ready. Failed startup
  leaves the old app and its state intact.
- Staged app code needs real layout while it initializes. A disconnected DOM
  tree cannot substitute for that.
- Each session can touch only its own rendering tree. It must not discover,
  mutate, select, observe, or style the other session or controller staging UI.
- Expanded and browser-fullscreen views preserve state and route keyboard,
  pointer, focus, media, and resize behavior to the correct app.
- Native body/root sizing and painting work from source CSS, without
  app-specific copying of computed colors or font sizes.

## Proposed production arrangement, not adopted

One option is two script-free rendering frames inside the existing persistent
output iframe. The outer controller keeps the existing QuickJS engine; its
active and preparing sessions receive separate native documents. The inactive
frame has real viewport dimensions but is invisible and cannot accept input.
Only after initialization succeeds does the controller reveal it and dispose
of the former session. No guest source becomes an ambient script in either
rendering frame.

This adds browsing-context overhead and changes the frame hierarchy. It needs
agreement before replacing the current arrangement; it is not a decided design.
The other direction is one rendering document, which needs either a different
reload contract or carefully designed exclusions for private staging content.
Putting staging beneath an active guest's unrestricted root is not acceptable.

Before choosing the two-frame option, test rather than assume:

- Sharing the engine across session bridges preserves isolation and lifetime.
- Document capabilities and all DOM operations use the target's realm. The
  host now accepts an explicitly granted live document from another realm;
  the initial regression coverage is described below. Output-specific behavior
  still needs testing if its document arrangement changes.
- Font installation, navigation permission, and form defaults belong to the
  correct document and cannot reach the controller or another app.
- Renderer frames do not add network/navigation permission. Empty frame
  documents need a restrictive policy and no application scripts.
- Focus forwarding, fragment services, wheel scrolling, full screen, and
  first-paint backgrounds survive repeated swaps and viewport changes.
- Repeated replacements reclaim old sessions/documents and do not accumulate
  frames, listeners, references, or substantial memory.

This comparison did not change the live deployment or Bunny archive. The later
mutation-observer checkpoint updated those artifacts without changing this
document-boundary design; see [project-page verification](project-page-machines.md).
Diagnostic output and the inspected side-by-side screenshot are under
`/root/macchiato-work/native-document-viewport*`.

## Granted-document realm correction

`packages/project-editor/test/document-realm.browser.test.js` executes the host
and MicroQuickJS in the outer realm, with either an element grant inside a
script-free iframe or a grant of that iframe's entire document. Previously the
document grant was rejected. For the element grant, computed style returned
an object from the controller's realm that failed the child's constructor
check; viewport and scrolling also used the wrong window.

The test now verifies a 420×260 child viewport independently of the 1000×700
controller, native 24px root font, 120px child-only scrolling, child selection
and pointer delivery (including instrumented selection), font installation
only in the child, and inability to query the controller's private content.
It also registers a custom element only in the child's registry and verifies
that guest creation rejects it without running its constructor. Checking the
controller's registry instead would accidentally permit that native code.

The fixture deliberately creates the child later than the controller and
bounds the guest's `performanceNow` result with readings from the child's
native clock. Previously it used the controller's different time origin
(409ms rather than 148ms in one run). It now uses the granted realm, matching
native event timestamps without changing precision or synthesizing a clock.

Navigation checks use the granted window's actual origin and document base
URI. A `srcdoc` URL reports a null origin even though the document inherits its
embedding origin. Both link assignment and form defaults are tested with no
navigation grant and with `allowNavigate: "self"`; outside origins remain
blocked in either case. These tests check permission decisions without sending
requests or navigating the fixture.

The implementation uses the granted realm for these operations and for
optional cleanup callbacks. Type checking and 78 browser checks passed across
document-realm, reference/range scope, mutation, resize, and intersection
observers. The before/after logs are in
`/root/macchiato-work/document-realm-{before,after,regressions}.log`.

This is a capability-correctness fix, not adoption of the two-frame proposal.
The four native-document layout TODOs above remain unresolved.

## Two-document feasibility experiment: 2026-09-12

`packages/website/test/project-rendering-documents.browser.test.js` now
implements a test-only controller for the proposed arrangement. It uses the
actual output QuickJS Wasm, guest bootstrap, compiler, and machine. A single
engine creates independent sessions, each granted a whole document in a
script-free iframe. Rendering frames use `sandbox="allow-same-origin"` without
`allow-scripts`, with a restrictive CSP. Only the controller realm imports
JavaScript and instantiates Wasm. This is not a change to `ProjectOutput`.

At equal 600×400 viewports, the experiment matches the native page exactly:

- With a 20px root, the `10rem` box is 200px wide and `2rem` margins are 40px.
- With a 24px root, the box is 240px wide and the margins are 48px.
- The guest body's background paints the canvas, including inside the margin.
- A hidden replacement has its real layout before it becomes visible.

Browser input reaches the active session while its replacement is hidden;
the sessions do not share counters or event handling. A replacement that
throws leaves the previous page and its state intact. Resizing to 420×260
updates both native and guest viewport readings. Child scrolling does not
scroll the controller. Three dark/light media changes reach guest listeners.
Guest-created iframes, string event-handler attributes, external image URLs,
and external link URLs remain rejected. No unexpected requests occurred.

Ten additional swaps leave only one live frame/session. After destruction,
DevTools GC collects all 13 removed frame elements and documents. The first
test attempt used Playwright frame locators; those retained frame-element
handles through DevTools, even though the documents were collectible. A heap
snapshot showed strong paths from `(Global handles)` through `DevTools console`,
not through the machine. Using coordinate clicks and controller-side DOM
inspection removed that test-owned retention without changing the runtime.
The optional `MACCHIATO_TEST_HEAP_SNAPSHOT` flag records a fixture-only snapshot
when investigating such failures; no profiler is added to production.

The experiment exposed missing `scrollX`/`scrollY` aliases in the full QuickJS
guest. Its shared environment now forwards these through the existing
`pageXOffset`/`pageYOffset` host reads. The regression also checks scrolling
and reading the position within one guest callback, without waiting for a
later event. This does not establish complete browser parity: the host's
existing integer-valued offset protocol remains unchanged.

MicroQuickJS's original global bindings were value slots, so installing an
accessor for a prelinked name failed. The engine now marks such a
reference with a bit from its existing header padding and stores the traced
property key. Reads and writes use the ordinary getter/setter execution path;
ordinary variables keep their direct-value path. Later-loaded bytecode can
bind the same accessor. This is an engine binding change, not event-driven
viewport caching, and does not implement every ECMAScript property descriptor.
The shared guest environment therefore uses live viewport and scroll getters
on both engines. Tests cover binding before/after installation, getter/setter
errors, GC, and iframe resize/scroll. The matched Resources build passed all
385 editor/runtime tests and the full editing stress test; it is served locally
and included in the 2026-09-12 `12b7fc7` Bunny export. This does not resolve the
separate production rendering-document decision described above.

Likewise, this fixture does not yet establish real-project font swaps,
full-screen focus behavior, first-paint handoff under delayed resources, or
frame memory/latency overhead. Those remain integration gates if this design
is adopted.

The combined comparison/lifecycle run reports six passes and the four existing
production TODOs. A final rerun including the external-link rejection passes.
Logs and inspected screenshots are under
`/root/macchiato-work/rendering-documents*`; `equal-documents.png` places the
native page on the left and the QuickJS page on the right. The existing local
site and Bunny archive are unchanged. Approval of the production frame
hierarchy is still outstanding.

## Delayed font handoff: 2026-09-12

The experiment now holds approval of the embedded Libre Baskerville font used
by the Mahjong example. While that decision is pending, six sampled animation
frames each show only the original interactive document. Actual pointer and
keyboard input still increments its counter. A screenshot pixel inside the
body margin stays blue; neither the replacement's pink canvas nor the
controller's white background appears in that capture.

The initial regression failed: the experiment ran application scripts before
waiting for stylesheet fonts, so startup could measure fallback glyphs. It now
uses the same pre-script `onmsg(0)` checkpoint already present in production
`ProjectOutput`. This fixes the experimental controller, not a newly discovered
production font-loading regression. The production lifecycle test now also
asserts that startup does not run before approval and that its text measurement
agrees with the final loaded-font layout.

After approval, the replacement's startup measurement and the ordinary native
page both report 238px for “Widening horizons.” The assertion allows one pixel
because the existing rectangle ABI rounds coordinates; this is not a claim of
fractional-metric fidelity. The face belongs only to the preparing document,
not the active one or the controller. It remains hidden until explicitly
revealed, then paints its own background and receives mouse/keyboard input.
A rejected font discards only the replacement, leaving the old state intact.
All 15 removed frames/documents remain collectible after subsequent swaps.

The combined rendering, production lifecycle, and native-document comparisons
report six passes and the same four known production TODO failures. The
before/after logs and inspected native/guest screenshots are under
`/root/macchiato-work/rendering-fonts-{before,after,regressions}` (logs use the
same names with `.log`). No live assets, owner projects, server process, or
Bunny archive changed. Real-project swaps, the full frame hierarchy,
full-screen focus, and overhead measurements remain integration work; this
bounded font experiment does not establish those properties.
