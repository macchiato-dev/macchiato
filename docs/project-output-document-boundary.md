# Project output's rendering document

## Current direction: direct document refresh and guest-directed live updates

The additional two-rendering-frame design below was **not adopted**. Output
must also work without an iframe. The implementation now accepts a real
Document grant for whole-page output, or an element grant for embedded output.
The website may use its existing configurable outer iframe; this change adds
no frames and does not require one in `ProjectOutput`.

There are two distinct update paths:

- A replacement `load` creates a fresh guest session. For a Document grant it
  retires the old guest before replacing the document element. The browser
  Document, history, and interpreter remain; application state restarts.
  Failed startup can be recovered by another load, but does not restore the
  retired guest. Element grants retain their isolated staging-subtree path.
- A guest-directed live update uses the current session and its own update
  code. `run` does not dispose the session or rerun startup automatically.
  The guest decides how to update its DOM and preserve application state.
  `setContent` also keeps the session, but only retains matching DOM trees;
  it is not a general state-preserving DOM patcher.

Neither path adds a debounce to a ready update's handoff. The editor's existing
typing/build debounce is separate. A guest capable of genuine in-place updates
should not be forced through the replacement-load fallback.

The document viewport comparison now passes its root-unit and canvas-color
assertions. The following sections preserve the earlier investigation and
experimental requirements; their claims about pending production assertions
and retaining the old guest after every failed startup describe that earlier
design, not the current Document replacement contract. The rebuilt export and
local live site now pass the verification recorded below.

The rebuilt-site stress test also passes with the direct Document grant:
expanded output works before the editor finishes downloading, document
attributes survive initial loading and edits, repeated invalid CSS edits
recover, and no additional rendering frames are introduced. The light-theme
editing screenshot was inspected. Read-only exported and local live checks also
pass for full-height Mahjong, Cat Memory's eight pairs and reset, 50 tour slides,
and SQLite fragments. Seven principal served assets match the export after
restart. This is a local deployment, not a Bunny staging deployment.

## Initial mount uses the compiled application

The editor already has the compiled project when it mounts the output. It now
passes that project into the first guest session, in either grant mode. The
previous path created an empty session, acknowledged readiness, then replaced
it with a second session through another request. That unnecessary document
replacement also removed the loading shell before the real application arrived.
No extra debounce or iframe is introduced by the single-start path.

`project-initial-output.browser.test.js` uses the real output device, frame
controller, and QuickJS runtime. Before the fix it counted two guest surfaces;
afterward it counts one. The test holds the runtime download, samples an actual
screenshot pixel to check the light/dark loading backdrop, then verifies the
compiled document language, application CSS, project-file fetch, and counter.
Subsequent appearance changes keep the counter's state. A throwing initial
guest leaves no registered output or orphan frame and a fresh mount recovers.
Failed frame startup closes the channel before removing the unregistered frame.

The iframe cases use native color-scheme inheritance: forcing a Playwright
media override propagates into child frames and defeats the inheritance being
tested. The Element cases use the native page media preference. This is not a
claim that setting `color-scheme` on an element rewrites page-wide media queries.

The focused Chromium run passes 14 tests, including real QuickJS stateful
updates in both grant modes without frames, fresh-state replacement, retired
callback disposal, recovery after a throwing edit, fragment Back/Forward,
root/canvas fidelity, and the existing element-staging lifecycle checks.
`project-output-live-update.browser.test.js` exercises the guest-directed path
by changing code and content while retaining the counter, node, and session;
it separately verifies that replacement reload resets that counter.

## Original verified mismatch

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

## Nested engine and view-mode focus: 2026-09-12

The experiment now runs its controller, machine, and shared QuickJS engine
inside a persistent outer output iframe. The active/preparing script-free
rendering documents are children of that iframe. Its native comparison page
is also inside the outer frame for equal-sized measurement. The previous
layout, delayed-font, input, isolation, and collectible-document checks still
pass with this additional boundary. No interpreter/controller is installed
in the top website realm.

New controls exercise both a CSS expanded view and the browser Fullscreen API.
Native fullscreen is checked in both ancestors: the controller's fullscreen
element is its output mount, and the top document's is the persistent iframe.
The rendered guest viewport changes from 600×400 to 1240×600 and returns to
600×400. The controller document, active session, input value, and counter
remain intact. Screenshot pixels retain the application's canvas color.

The first focus test failed: clicking a controller control took focus away
from the input, so later typing went nowhere. Merely focusing the iframe
element or its window did not restore that control in this Chromium test.
The experimental controller now remembers its last focused native element
weakly, restores it only if it still belongs to the document, and removes the
focus listener when retiring the session. It does not copy caret coordinates,
text, selections, or keyboard events, and adds no machine permissions. The
test reads the input's native selection for verification rather than expanding
the guest API just to support that probe.

Mouse and keyboard activation each pass for expansion and native fullscreen.
After entry and exit, real typing inserts characters at a caret in the middle
of an unsaved value, without a second click. The same 15 retired frame elements
and documents remain collectible after the additional focus listeners.
Native fullscreen exit is requested through the browser API in this test;
it does not establish Escape-key behavior on every browser or operating system.

Evidence, including inspected expanded/fullscreen screenshots, is under
`/root/macchiato-work/rendering-{nested-engine,view-modes-before-focus,window-focus,retained-focus,view-modes-regressions}`
and the corresponding `.log` files. The final combined run reports six passes
and the four existing production layout TODO failures. This is still a test-only
controller, not Resources Edge integration or approval of the proposed frame
hierarchy. Real-project focus during hot reload, fragment services through the
full hierarchy, browser diversity, and overhead measurements remain open.
Live assets and the Bunny archive are unchanged by this experiment.

## Fragment navigation through rendering documents: 2026-09-12

The same nested-frame experiment now clicks both a virtual chapter link
(`#/chapter.html#details`) and an ordinary anchor (`#details`), then traverses
Back and Forward. The guest receives native `hashchange` events from its own
window and reads the route from that document. No synthetic route event or
cached guest location stands in for browser behavior. Neither the persistent
controller URL nor the website URL changes; the actual rendering document
survives navigation. The ordinary anchor scrolls that document.

This uncovered two independent problems:

- The project compiler added `target="_blank"` to every link, including fragment
  links. The sandbox rejected the attempted popup. Fragment links now omit
  that automatic target; other links keep the existing configurable new-window
  default. Machine destination validation remains unchanged. The compiler
  regression failed before this fix and passes afterward.
- Even with that fix, the experiment's `srcdoc` frame resolved fragments
  against the controller's inherited base URL and failed the route test.
  Giving the fixed, script-free shell its own Blob document URL passes it.
  The experimental controller revokes that URL when retiring the session.
  It grants neither scripts nor popups, and does not create a guest Blob API.

Removing the guest's hash listener stops callbacks while native Forward
navigation still works. All 16 retired frame elements and documents remain
collectible. An intermittent fullscreen check was also waiting only for
`fullscreenElement`, which becomes visible before `fullscreenchange` dispatch.
The test now waits for that native event before checking the existing focus
restoration handler, rather than adding a delay or repairing the caret.

The combined compiler, lifecycle, native-layout, and rendering-document run
reports 13 passes and the four existing production layout TODOs. Logs and
inspected screenshots are under
`/root/macchiato-work/rendering-fragments-verified` (with a matching `.log`).
Chromium also reports a script-blocked console diagnostic during history
navigation in this script-free fixture. Its source has not been attributed;
the test records it rather than claiming a clean console. No popup attempt,
unexpected network request, or page exception occurred in the passing run.

Only the compiler fix is production code. The rendering frames, Blob shell,
and focus coordination remain a feasibility experiment, not an approved
production hierarchy. Real-project integration and overhead measurements
remain open; this does not resolve the four native-layout TODOs.

## Host timers with script-free rendering frames: 2026-09-12

The previously unexplained script-blocked diagnostic was an actual timer
failure, not harmless logging. A minimal browser-only reproduction schedules
callbacks created by the parent on a script-free child's window. Chromium
delivers animation-frame and idle callbacks but blocks its ordinary timeout.
The callback's parent origin does not make the child's timer runnable.
DevTools reports the security error without a JavaScript stack.

The document-realm test now sets `sandbox="allow-same-origin"` explicitly.
Previously its empty page was described as script-free but had no sandbox
flag preventing scripts. New guest probes schedule/cancel timeouts, schedule
and cancel an interval from its callback, and request both native and
controller-throttled animation frames. Before the fix, all four combinations
of document/element grant and navigation policy time out: only the native
animation callback reaches the MicroQuickJS guest.

Ordinary timers now use the machine host's global scheduler, including task
callbacks, throttled frames, and cleanup's timeout fallback. Cancellation and
destruction use that same scheduler. DOM constructors, viewport/time-origin
reads, scrolling, selection, native animation frames, and idle deadlines still
belong to the granted document. The shared Wasm interpreter remains in the
controller's execution realm; no additional guest capability or script
permission is granted to its rendering document.

All four probes pass after the fix, with the canceled timeout absent. The
QuickJS rendering experiment also passes and now asserts that the entire
browser console is error-free, including navigation. All 16 retired documents
remain collectible. The optional `MACCHIATO_TEST_BROWSER_LOG` flag records
DevTools security entries in this fixture only; no diagnostics enter the
production host. Before/after evidence is in
`/root/macchiato-work/script-free-timers-{before,after}.log`; exploratory
DevTools traces use `/root/macchiato-work/rendering-browser-*.log`.

This corrects timer execution for cross-document grants, not the production
output hierarchy. The native-layout TODOs and integration decision remain.

## Reusing rendering frames: 2026-09-12

The experiment now keeps at most two rendering iframe elements and their
browsing contexts for its lifetime. An idle frame receives a fresh fixed Blob
document through `location.replace`; it is not detached and appended again.
Retiring a session destroys its machine, revokes its Blob URL, and makes the
frame invisible and inert for reuse. The interpreter still lives in the one
persistent outer controller frame. This does not add another Wasm instance.

The first reuse assertion failed against the previous experiment, which
removed the former frame. With reuse implemented, ten further swaps preserve
both original frame identities and both WindowProxy identities. Those swaps
do not increase `history.length`. Root-relative lengths, body canvas painting,
delayed-font handoff, pointer/keyboard input, expanded/fullscreen focus, timers,
and ordinary fragment navigation still pass. A candidate initially lost the
active route and started at `/`; the experiment now carries the active
fragment into the new document URL before guest startup.

Collection is checked while the controller is alive, not only after teardown.
Among retired sessions, only the idle frame's current document remains alive;
the other retired documents have been collected. Destroying the experiment
then releases both frames and all 17 documents. The idle frame intentionally
retains its last rendered DOM until reused. This is a bounded extra document,
not a measurement of its byte cost for large projects.

### History remains an integration blocker

Preserving the current fragment is not sufficient. Browser Back after a live
update can restore an earlier joint-frame history entry containing a revoked
Blob URL. In the full experiment this detached the active document and later
cleanup encountered a cross-origin WindowProxy. This was not a Wasm parsing or
guest routing error.

`packages/website/test/project-rendering-history.browser.test.js` reproduces
the problem without a machine or guest runtime. Two script-free frames make
fragment entries, replace the idle frame's document, and then traverse Back.
The active document is lost rather than retained at the preceding fragment.
Its assertion executes as a **known failing TODO**, not a passing history
check. Keeping it separate prevents that destructive navigation from
invalidating unrelated lifetime/layout assertions in the main experiment.

Before adopting this arrangement, routing/history must have a stable owner
across replacements. A possible direction is the persistent output controller
owning the fragment history, with the guest runtime using its existing route
service. That needs an explicit design for native anchors, event semantics,
and Back/Forward; it is not implemented here. Retaining every old Blob URL or
silently disabling Back would not satisfy the intended behavior.

Evidence is under `/root/macchiato-work/rendering-reuse-*`, including the
before/after route checks, frame-identity and collection results, and the
isolated failing history test. No production frame arrangement, local server,
owner project, or deploy archive was changed by this experiment.

The final combined run reports 13 passes and five known failing TODOs: the
four existing production layout comparisons and this experimental history
comparison. The delayed-font screenshot was inspected. The history failure
is not counted as a successful integration gate.

## Stable documents and controller-owned routes: 2026-09-12

The next experiment keeps both native Documents as well as both frame elements
and browsing contexts. A rendering frame loads its fixed script-free Blob shell
only once. After retiring a session, its frame becomes hidden and inert. On
reuse, the controller replaces its document element with fresh, host-created
`html`, `head`, and `body` nodes before granting the next session. It does not
call `document.open`, reload, or navigate to a new Blob. The two Blob URLs live
until controller destruction. The old implementation remains as an executing
negative TODO in the browser-only history comparison.

The persistent output controller owns the fragment. The test application
intercepts its own ordinary fragment-link clicks in QuickJS and calls the
existing generic service bridge. That controller service changes only its
`location.hash`, accepts bounded fragment strings only from the active session,
and returns an error string for denied requests. A preparing session cannot
navigate. Initially throwing for this expected denial escaped the guest's
JavaScript catch through the host bridge; returning a service result keeps that
ordinary refusal distinct from a host execution failure.

On a native controller hash change, the controller calls the active guest's
explicit application callback through the existing `onmsg` entry point. The
guest reads the route service and resolves local anchors with native
`scrollIntoView`. Handoff also notifies the new active guest. No machine API,
host-side DOM event simulation, or fake native `HashChangeEvent` was added.
This deliberately tests an application/controller routing contract, **not** a
complete browser-compatible location/history facade for arbitrary projects.
The actual website's address remains unchanged; the output controller's
fragment changes.

The real QuickJS experiment now checks Back and Forward after replacement,
retaining the new DOM and counter state, and ten further swaps that preserve
both Document identities without appending history entries. Native root units,
body canvas paint, font preparation, focus/caret through both expanded modes,
timers, input, media updates, and session isolation still have their existing
assertions. A click test initially missed an offscreen counter after anchor
scrolling; scrolling it into view before coordinate input fixed that test.

With persistent Documents, counting retired Document weak references would
mistake intentional reuse for a leak. The fixture additionally tracks each
retired document element. While running, only the idle frame's last DOM remains
among retired roots; earlier roots are collectible. Final destruction releases
the two frames, their Documents, and every retired root. This is reachability
evidence, not a byte-cost measurement for large projects.

A separate browser-only containment probe removes the original CSP meta while
replacing the root three times. Each external image attempt is blocked by the
still-active document policy before making a request; inserted scripts never
execute. This probes browser enforcement independently of the machine, whose
element/attribute/resource restrictions remain unchanged. The expected browser
policy diagnostics stay in that isolated test, not the clean application test.

This is still test-only. Production uses the previous output hierarchy and its
four native-layout comparisons still fail. A production choice must cover
ordinary guest routing semantics, real-project regression tests, first-paint
handoff, and overhead of the extra browsing contexts. No local deployment,
owner project, or Bunny archive was changed. Evidence is under
`/root/macchiato-work/rendering-stable-*`.

The combined run in `rendering-stable-verified.log` reports 15 passes and five
known failing TODOs (four production layout cases and the rejected history
arrangement). The delayed-font side-by-side screenshot was visually inspected;
native and guest typography, root-relative geometry, and canvas color match.
