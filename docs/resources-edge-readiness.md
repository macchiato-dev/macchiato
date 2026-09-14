# Resources Edge readiness

Current local verification: 2026-09-14, export `resources-co-4b20760`.
This is a current-state record, not a claim that the historical experiments in
the other architecture documents are all production requirements or complete.

The latest export separates framework build tooling from ordinary document
compilation. Mahjong no longer loads Vue/Svelte compilers or framework runtimes;
the ordinary compiler is 291,056 bytes gzipped instead of 1,179,422. Compiler,
framework/graphics, exact Bunny-entry, and five read-only live-project checks
pass. Evidence is in `lazy-framework-compiler.log`, `lazy-framework-browser.log`,
`lazy-framework-bunny.log`, and `lazy-framework-live.log` in the work directory.
The 173-file export verifies before and after archive extraction.

Saved-output-first now keeps only the latest successful build in its own SQL
row, selected by the frontend guest on opening. Failed builds and stale writes
do not displace it; derived writes do not create source versions. All five live
owner projects reopen with both compilers blocked, with their interaction,
mobile, and theme checks passing. Public responses cannot include unpublished
output. The migration and persistence routes pass the exact Bunny-entry tests.
See the [verification and bounds](project-editor-typing-performance.md#latest-successful-output-on-opening-2026-09-14).

Current archive: `/root/resources-bunny.tar.gz`, root `resources-bunny`, 173
verified files, SHA-256
`c2797002ccd25055551d1697ab27b0fc131115fabc82f00230de725ea89b7f69`.
The previous framework-only archive is retained at
`/root/archive/2026/09/14/resources-bunny-83cbe1b-before-saved-output.tar.gz`.
No Bunny deployment was performed.
The final audit below records the preceding scope, before this new request.

ZIP import now has a drop/file-picker dialog, with native host file activation
and guest-owned import application. Invalid/multiple-file drops preserve the
draft, and successful retries clear the previous import error. Font, WASM, and
binary-resource bytes survive import instead of being decoded as text. The
site stylesheet allowance is 96 KB to accommodate the dialog; guest output
CSS limits are unchanged.

Verification: 21 archive/device unit tests, three browser regressions (including
all starting points and Mahjong's signed-in export into a new project), and
three exact Bunny-entry tests pass. Screenshots cover desktop/light and
mobile/dark, and the native file chooser is exercised rather than only setting
the hidden input. The live `benatkin/classic-chinese-mahjong` project was also
exported, imported into a fresh session-only `/try` draft, and exported again:
identical files/configuration, 144 rendered tiles, no errors or source changes
to the original project. Logs are `archive-browser-verified.log`,
`archive-unit-final.log`, `archive-live-roundtrip.log`, and
`bunny-zip-import-tests.log` under `/root/macchiato-work`.

## Low-cold-start design

Low cold-start overhead is an explicit architectural objective, not just an
unmeasured hope. The single Bunny entry registers the HTTP handler before
Storage access, database initialization, or backend WASM compilation. The
anonymous home path serves build-time-rendered, localized HTML with its CSS
already prepared; it does not boot an application machine to render that page.
Backend initialization is demand-driven, and successful module and machine
initialization is reused within the running script instance. The deployed
composition disables speculative backend prewarming, so it does not compete
with the first home response.

These properties are tested against the actual bundled entry, including a
test that forbids any WASM startup while serving the anonymous home. They are
the reason to expect lower cold-start overhead than eagerly initializing the
whole application. They do not eliminate Bunny's own script startup cost,
the Storage round trip, or the first dynamic request's deferred work.

Latency measurements should validate this design, not start from an assumption
that it has no cold-start strategy. Measure platform startup, the home HTML
Storage fetch (headers and complete body), and the first dynamic request's
download/initialization/database work separately. Compare warm requests too.
The home handler currently reads the full HTML body before returning it, so
Storage time-to-first-byte alone is not its complete response cost.

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
- The current broad app browser suite passes all 43 applicable tests with the
  framed editor. Eight older SQLite-site cases remain explicitly excluded;
  this is not a claim that those obsolete cases pass. Coverage includes
  accounts, templates, ZIP round-trips, graphics, storage denial, saves and
  history, notifications, and organization roles. Editor checks now inspect
  its actual iframe document, including selection, scrolling, and theme colors.
- Real JavaScript (358 lines), Rust (405 lines), and TypeScript (2,191 lines,
  104 KB) pass highlighted editing at both ends, Unicode insertion, undo/redo,
  folding, and wheel-driven rendering without a follow-up click. Median
  per-key Playwright round trips were about 24–25 ms for JavaScript/Rust and
  40–41 ms for TypeScript, not isolated interpreter timings.
- All 15 current packaged appearance/editing/language checks pass. They include real
  frontend startup and navigation on desktop/phone; explicit and system themes;
  repeated edits; undo/redo; historical selection and republishing; invalid CSS
  recovery; and language bytecode loaded without replacing the editor session.
  The full rerun includes both saved and unsaved 20-cycle geometry fixtures and
  the substantial-source test, using the exported `b46589e` browser assets.
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
The current broad run is `readiness-current-framed.log` (43 passes, 375.8s),
preceded by six focused passes in `readiness-frame-tests.log`. Search screenshots
in `readiness-current-framed/` were reviewed at phone/light and desktop/dark
sizes. Substantial-source coverage is in `real-source-interactions-final.log`.
The complete packaged rerun is `readiness-final-packaged.log` (15 passes,
283.4s), with screenshots in `readiness-final-packaged/`. No runtime changes or
archive regeneration were needed for these test and documentation updates.
The earlier broader app checks remain in `current-resources-browser-suite.log` and
`account-current-flow-final.log`.
The latter app test waits for native form navigation and guest readiness, uses
the actual output Document, and explicitly selects a draft/history checkpoint
instead of treating `aria-current` as an alias for newest.

## Historical observations and follow-up measurements

The interrupted pre-adaptation run, `readiness-current-site.log`, timed out on
outer-document selectors left over from the unframed editor. It is retained
as diagnostic history, not an application failure diagnosis or a passing
suite. The corrected full run above used this explicit exclusion pattern:

```text
resources sqlite site (is mounted|DOM schema|transitions|uses a moderate|prefetches|has a responsive)|resources user menu (module composes|safe polygon)
```

Those eight old SQLite-site cases still need separate migration or retirement.

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
declared passing. The current 43-test run uses `--test-skip-pattern` for that
separate legacy surface; the earlier negative lookahead name filter did not
exclude it.

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

`/root/resources-bunny.tar.gz` contains the verified `83cbe1b` export. SHA-256:

`7f69bf0a37024755bc15d99ba344a52bd7a0777bbf323455e176653c3a430c58`

The prior archive is preserved at
`/root/archive/2026/09/14/resources-bunny-b46589e-before-lazy-framework.tar.gz`.
Follow the [manual staging instructions](../packages/website/README.md#update-an-existing-staging-deployment-manually).
Staging verification is distinct from these local build and browser checks.

## Final local-readiness audit (2026-09-13)

The requested implementation is ready for a staging deployment. This audit
checks the running site and the actual upload artifact, not just isolated
library tests. Rust host experiments were optional and were not needed to
reach this state; no extra privileged host layer was introduced.

| Requirement | Current evidence |
| --- | --- |
| Existing Resources Edge content works | Read-only live checks of all five owner projects: Mahjong board, Cat Memory through all eight pairs and reset, 50 tour slides, SQLite virtual links, and the article. Editor, output, theme switches, and phone layouts pass. |
| Immediate, consistent appearance | All eight real-startup desktop/phone theme cases pass, including system and explicit overrides, navigation, and both editor/output loading. The separate output boundary test changes system appearance without restarting guest state. |
| Editing remains responsive and accurate | Full packaged editing workflow, two 20-cycle responsive fixtures, and real JS/Rust/104 KB TypeScript fixtures pass. Typing, Unicode, undo/redo, folding, scrolling, search, history, and malformed-CSS recovery are exercised. Recorded performance comparisons and their limitations remain above. |
| CodeMirror stays in its own WASM surface | The default surface uses the trusted iframe shell and MicroQuickJS. The browser regression inserts hostile HTML by initial content, typing, and rich paste: source remains text, no script/image/frame/meta nodes appear, no external request occurs, and an ungranted `Eval` call fails. |
| Output remains contained, with or without an iframe | Real guest calls attempt external images, stylesheets, scripts, frames, refresh metadata, navigation, fetch, and CSS URLs. No unexpected request occurs; the previous output survives rejected replacements. Element mode is tested without a CSP fallback. Guest globals and host storage remain separate. |
| Lazy language loading | The registry covers JS/JSX/TS/TSX, HTML, CSS, JSON, Vue, Svelte, Markdown, Python, Rust, SQL, YAML, and C/C++. Browser checks cover requested-only downloads, shared JS/TS bytecode, delayed and failed grammar loads, retry, and preserved content/history. Plain text loads no grammar. |
| Output updates follow the chosen lifecycle | Iframe and Element staging, startup failure, cancellation, font approval, cleanup failure, retained editor focus, and compiled-module reuse pass. Guest-directed updates keep the existing session. |
| Ready-to-upload Bunny artifact | The extracted 171-file manifest verifies. The exact bundled entry registers before deferred work, serves static localized home pages without starting WASM, and exercises database-backed create/save/history/CSRF paths plus recovery after a database outage. All five main live executable hashes match the export, and the root archive hash matches the recorded value. |

Final evidence under `/root/macchiato-work`:

- `readiness-unit-final.log`: 118 non-browser tests pass.
- `readiness-current-framed.log`: 43 applicable broad-site tests pass.
- `readiness-final-packaged.log`: 15 packaged editing/appearance checks pass.
- `readiness-containment-final.log`: 13 boundary/lifecycle checks pass, using
  the built editor runtime rather than a replacement interpreter.
- `readiness-bunny-entry-final.log`: three exact-entry checks pass against the
  extracted archive, with dummy credentials and no network permission.
- `readiness-live-final.log`, `readiness-live-hashes-final.log`, and
  `readiness-manifest-final.log`: live projects, executable equality, archive
  identity, and deployment inventory. The live Mahjong desktop and tour phone
  screenshots were reviewed in `readiness-live-final/`.

These are Chromium and local Deno results, not a formal security audit or a
claim about Bunny's measured cold-start budget. The eight old SQLite/schema
demo cases are still separate from this deployed architecture. The historical
one-off geometry assertion has not recurred in repeated saved/unsaved stress
checks; its cause was not established and no speculative workaround was added.

No Bunny deployment or owner-content write was performed. Actual staging
checks of provider callbacks, Bunny limits, and staging credentials follow the
manual deployment instructions; production rollout is a separate decision.
