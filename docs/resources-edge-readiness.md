# Resources Edge readiness

Current local verification: 2026-09-13, export `resources-co-b46589e`.
This is a current-state record, not a claim that the historical experiments in
the other architecture documents are all production requirements or complete.

## Current build

A transient database outage no longer permanently poisons initialization.
The application guest and its account, content and organization stores clear
failed initialization promises while preserving shared in-flight work and
successful initialization. Initialization errors use the guest's structured
error response instead of losing their detail at the controller boundary.
The exported `4042e11` control reproduces the failure: after one database 503,
the next deferred request returns 503 without another SQL attempt. The new
export recovers, using the same loaded backend artifact. Anonymous home stays
available during the outage. No write operation is automatically retried.

Only the server application guest changed in this rebuild. The browser
controller, machine host, frontend, editor and output runtime bytes match the
previous export. The compressed backend artifact grew by 306 bytes.

Static JavaScript, WASM, and language bytecode have precompressed gzip variants
in both local resources-edge and the Bunny export. Browser URLs, MIME types,
streaming compilation, and no-store caching remain unchanged. The initial
four runtimes plus HTML grammar transferred 2.57 MB instead of 8.01 MB in the
browser test, about 68% less data. This is not an end-to-end speedup claim.

Editor module transfer now overlaps output startup after project compilation;
editor execution still waits for the output paint checkpoint. A small cold-load
comparison shortened editor readiness by about 1.3 seconds for Mahjong and
0.6 seconds for Cat Memory under controlled network conditions. Output timing
was mixed. See [the measurements](project-editor-typing-performance.md#overlap-editor-transfer-with-output-startup).

The intermittent editor error is now reproduced and fixed. It occurred in
autosave cleanup, not the subsequent Python grammar failure: Babel's finally
helper attempted a sparse-array write that MicroQuickJS rejects. The guest
build preallocates its private exception-record slots. Two table literals
change, adding eight bytes to the editor WASM; the host and sandbox policies
are unchanged. See [the failing control and fix](project-editor-typing-performance.md#dense-babel-exception-records-2026-09-13).

The editor now defaults to a separate iframe and MicroQuickJS machine, while
the project UI retains history, details, and ownership of the output. The
controller's `editorFrame: false` option keeps the direct Element path.
The frame runs a fixed trusted shell; project code still executes only in its
output guest. Failed language downloads remain recoverable highlighting
warnings, not editor crashes.

The tab-strip failure is now reproduced and fixed: guest `after()` reads real
sibling order for adopted nodes, tab replacement disposes tooltip listeners,
and guest event dispatch decodes the full unsigned callback word. No host
capability or limit was widened. The regression now performs eight complete
open/close cycles across narrow and wide layouts.

History uses one persistent delegated click listener instead of retaining new
row listeners on every opening. A 64-version fixture now passes 80 openings,
selection through nested row text, and continued editing. This fixes another
callback-slot exhaustion without changing the host or widening its limits.

The editor Configuration view now formats JSON in the guest application.
MicroQuickJS ignores the indentation argument to `JSON.stringify`; the display
formatter preserves its serialized values while adding indentation. Storage
remains compact JSON. The editor WASM grew by 992 bytes; the machine and
frontend controller did not grow. The rendered Configuration view was checked
in Chromium, including syntax highlighting and read-only behavior.

The project output uses the staged replacement behavior described in
[the document-boundary notes](project-output-document-boundary.md). Both iframe
and Element output are supported. A replacement does not destroy the current
application until the replacement is ready; guest-directed live updates retain
their existing session. This is separate from the typing/build debounce.

## Verified

- All 118 non-browser tests in `packages/project-editor/test` and
  `packages/website/test` pass, including JSON formatting and resource policies.
- The mixed app browser suite has 43 passes and eight failures in the older
  SQLite-site tests. All current resources-edge cases pass: account creation,
  project publication/reversion/deletion, anonymous editing, version selection,
  templates, ZIP round-trips, resource recovery, graphics, storage denial,
  network boundaries, theme changes, Find/Replace, notifications, and roles.
- All 13 packaged appearance/editing/language checks pass. They include real
  frontend startup and navigation on desktop/phone; explicit and system themes;
  repeated edits; undo/redo; historical selection and republishing; invalid CSS
  recovery; and language bytecode loaded without replacing the editor session.
- The strengthened language lifecycle test also passes with Chromium slowed
  to 4x CPU cost. It explicitly awaits completed autosave and checks for errors
  around every file switch. The old artifact fails that test at normal speed.
- All 28 runtime compatibility checks pass, including a failing-before control
  and 21 generator cleanup cases compared with native JavaScript.
- All 25 callback/surface/initial-output browser checks pass, including signed
  callback-word boundaries and inert HTML source in the editor through loading,
  native insertion, and rich clipboard paste.
- The 12 initial-output/lifecycle/live-update checks were rerun and pass with
  the loading change, covering both ordinary Element and framed output.
- Screenshots of light editing, history, desktop Mahjong, and phone Cat Memory
  were reviewed, in addition to the earlier Configuration/output checks.
- Read-only exported and live checks pass for full-height Mahjong, all Cat
  Memory pairs and reset, 50 tour slides, and SQLite fragment navigation. No
  owner project or notes were saved. Nine live asset paths exist in the export;
  seven live executable assets match it byte-for-byte after HTTP decompression.
- All 171 deployment files verify before and after archive extraction,
  including equivalence between compressed variants and their originals. The
  compressed backend artifact runs its routing, rendering, and policy guests
  in Deno. Nothing has been deployed to Bunny.

Current evidence is in `/root/macchiato-work/dense-finally-browser.log`,
`dense-finally-slow.log`, `dense-finally-before.log`, `dense-finally-modules.log`,
`dense-finally-backend.log`, `dense-finally-runtime-tests.log`, and
`dense-finally-live-verified.log`, with their screenshot directories. The unchanged
output lifecycle checks remain in `editor-preload-output-boundaries.log`;
callback/surface boundary tests remain recorded in `tab-lifetime-boundaries.log`.
The earlier broader
app checks remain in `current-resources-browser-suite.log` and
`account-current-flow-final.log`.
The latter app test waits for native form navigation and guest readiness, uses
the actual output Document, and explicitly selects a draft/history checkpoint
instead of treating `aria-current` as an alias for newest.

## Still open

An initial packaged rerun failed an unchanged-pane-size assertion after a
phone/desktop switch and bulk paste. It did not repeat in the focused rerun or
the final full packaged suite; the cause is not established. Rectangle/status
diagnostics and a failure screenshot are now retained. A separate test race
was removed by creating recovery data through a real editor change rather than
overwriting session storage behind an in-flight save. See the
[history checkpoint](project-editor-typing-performance.md#history-list-callback-lifetime).
The follow-up adds a focused 20-cycle responsive/paste test and two further
passing long-editing runs. It also reruns eight behavior/containment suites
(238 passing assertions/subtests), including caret blink, trusted dragging,
pane resizing, media queries, and document/reference boundaries. See the
[geometry follow-up](project-editor-typing-performance.md#responsive-geometry-follow-up).
These tests did not establish the cause of the original mismatch; no runtime
or layout workaround was added.

The native bulk-insertion stress path took 14,070 ms for 106,458 characters;
the ordinary paste-handler path took 123 ms for 106,432 characters. Native
bulk insertion emits many input events in this fixture. This is not a
controlled native-versus-WASM comparison and does not attribute the delay to
the interpreter. Investigate that path without changing input-event semantics
or mistaking profiling overhead for application cost.

A controlled workspace-shell experiment now reproduces the bulk cost with
native CodeMirror too. Rendering the editor in an iframe reduces the guest's
106 KB replacement from about 12.1s to 6.7s; the repeated direct control returns
to about 12.2s. Narrower layout selectors do not recover that benefit. Ordinary
typing does not show a comparable improvement. See the
[workspace comparison](project-editor-typing-performance.md#full-workspace-rendering-document-control-2026-09-13)
for the controls, preserved input events, and the remaining integration boundary.
That separate rendering document is now the local/default editor surface.

The initially opt-in separate editor machine passed browser tests through the real
project UI, including 106 KB source, file switching, search, repeated themes,
and startup/disposal failure cases. The direct path also passes. This test
stubs output services; subsequent complete-site tests checked application
shortcuts and combined machine lifetimes before activation. See the
[editor-surface checkpoint](project-editor-typing-performance.md#opt-in-editor-surface-implementation-2026-09-13).
The live server and deployment archive below now include this integration.

The new path subsequently passed a complete-site fixture with real output,
theme changes, palette shortcuts, and interrupted startup. That work fixed
the frame-shell response CSP and cancelled-page lifecycle handling. It also
found and fixed the extra bootstrap exceeding the interpreter's 16-program
table when all grammars load. The direct long-editing test passes, and two
complete language reruns pass. Five further direct repeats and the two framed
language runs also passed. Extending that scenario reproduced the selected-tab
visibility problem and uncovered the sibling-order and callback-lifetime bugs
now fixed in this export; see the
[reproduction](project-editor-typing-performance.md#reproduced-tab-strip-and-callback-lifetime-failures).

The eight legacy SQLite-site failures concern removed schema paths and old
navigation/theme/menu expectations. They have not been skipped in source or
declared passing. A future focused command should use `--test-skip-pattern`
for that separate legacy surface; the negative lookahead name filter used in
this run did not exclude it.

The source controller now enables the separate editor surface by default.
Its full framed editing and appearance tests pass, and the failed-language
download test found a recoverable notification that needed forwarding to the
project UI rather than escalation as a machine error. That retry now passes.
See the [default checkpoint](project-editor-typing-performance.md#default-framed-editor-checkpoint).
The source checkpoint was followed by packaged tests and read-only live checks;
the local 3030 server now serves those rebuilt assets.

## Deployment artifact

The `b46589e` retry build passes the three actual-entry checks (static home,
deferred initialization, and recovery after a database outage), including
authenticated project creation, saving, workspace retrieval, history and CSRF
rejection through the exported guests and bundled libSQL transport. These use
an in-memory SQLite fixture and dummy credentials without network permission.
They pass again against the extracted deployment archive. The separate
compressed-backend routing/rendering/policy test also passes.

The packaged long-editing and lazy-language cases were rerun and both pass.
All five owner projects pass read-only live checks after the server restart;
no owner files or notes were changed. Desktop/phone screenshots were captured,
and the Cat Memory desktop screenshot was inspected. Its output is scrolled
after the full-game/reset interaction; this screenshot is not an initial-paint
check. Five live executable assets were compared with the export after HTTP
decompression and match exactly.

Evidence: `/root/macchiato-work/bunny-deferred-retry-before.log`,
`database-retry-entry.log`, `database-retry-extracted-entry.log`,
`database-retry-backend.log`, `database-retry-unit-final.log`,
`database-retry-browser.log`, and `database-retry-live.log`. Screenshots are
in `database-retry-browser/` and `database-retry-live/`.

Additional checks of the same `4042e11` export on 2026-09-13:

- Responsive geometry stress now covers a disposable saved project as well
  as an anonymous project: 20 phone/desktop/edit cycles each, with completed
  autosaves checked in the saved case. Both passed, with unchanged editor
  bounds and no machine errors. The older `4d569f7` control reproduces the
  finally-table error but retains its geometry; this does not establish the
  cause of the original historical geometry failure.
- Read-only live checks now include `benatkin/test-article`, completing the
  five existing owner projects. Its heading, three links, separate stylesheet,
  framed output, editor, and theme switches passed. Desktop and phone
  screenshots were captured; the desktop screenshot was visually inspected.
  No owner content was saved or changed.
- The actual bundled Bunny entry passed a Deno smoke test: HTTP registration
  precedes Storage access, and all eight combinations of GET/HEAD, English/
  Spanish, and open/closed signup state return the expected exported home
  without fetching or compiling the deferred backend. Network access was not
  granted. This verifies the local entry path, not Bunny's startup time.

Evidence is in `/root/macchiato-work/saved-geometry-current.log`,
`saved-geometry-before-painted.log`, `all-owner-article.log`, and
`bunny-entry-artifact.log`; screenshots are in `all-owner-projects/`.

`/root/resources-bunny.tar.gz` contains the verified `b46589e` export. SHA-256:

`0e04ab99f4e1dde4b14f5cd498da1dfa66e1f248e5bb74e259bd81d0e0426696`

The prior archive is preserved at
`/root/archive/2026/09/13/resources-bunny-4042e11-before-database-retry.tar.gz`.
Follow the [manual staging instructions](../packages/website/README.md#update-an-existing-staging-deployment-manually).
Staging verification is distinct from these local build and browser checks.
