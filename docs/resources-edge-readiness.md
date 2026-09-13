# Resources Edge readiness

Current local verification: 2026-09-13, export `resources-co-c671ef9`.
This is a current-state record, not a claim that the historical experiments in
the other architecture documents are all production requirements or complete.

## Current build

The editor now defaults to a separate iframe and MicroQuickJS machine, while
the project UI retains history, details, and ownership of the output. The
controller's `editorFrame: false` option keeps the direct Element path.
The frame runs a fixed trusted shell; project code still executes only in its
output guest. Failed language downloads remain recoverable highlighting
warnings, not editor crashes.

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

- All 112 non-browser tests in `packages/project-editor/test` and
  `packages/website/test` pass, including JSON formatting and resource policies.
- The mixed app browser suite has 43 passes and eight failures in the older
  SQLite-site tests. All current resources-edge cases pass: account creation,
  project publication/reversion/deletion, anonymous editing, version selection,
  templates, ZIP round-trips, resource recovery, graphics, storage denial,
  network boundaries, theme changes, Find/Replace, notifications, and roles.
- All 12 packaged appearance/editing/language checks pass. They include real
  frontend startup and navigation on desktop/phone; explicit and system themes;
  repeated edits; undo/redo; historical selection and republishing; invalid CSS
  recovery; and language bytecode loaded without replacing the editor session.
- Screenshots of light editing, history, desktop Mahjong, and phone Cat Memory
  were reviewed, in addition to the earlier Configuration/output checks.
- Read-only exported and live checks pass for full-height Mahjong, all Cat
  Memory pairs and reset, 50 tour slides, and SQLite fragment navigation. No
  owner project or notes were saved. Eight principal live assets match the
  export byte-for-byte after restarting the local server.
- All 153 deployment files verify before and after archive extraction. The
  compressed backend artifact runs its routing, rendering, and policy guests
  in Deno. Nothing has been deployed to Bunny.

Current evidence is in `/root/macchiato-work/editor-frame-packaged-ui.log`,
`editor-frame-modules.log`, `editor-frame-bunny-backend.log`,
`editor-frame-live.log`, and their screenshot directories. The earlier broader
app checks remain in `current-resources-browser-suite.log` and
`account-current-flow-final.log`.
The latter app test waits for native form navigation and guest readiness, uses
the actual output Document, and explicitly selects a draft/history checkpoint
instead of treating `aria-current` as an alias for newest.

## Still open

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
language runs also pass. An intermittent selected-tab visibility timeout after
repeated closes has not reproduced and is not declared fixed; see the
[complete-site checkpoint](project-editor-typing-performance.md#complete-site-integration-checkpoint).

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

`/root/resources-bunny.tar.gz` contains the verified `c671ef9` export. SHA-256:

`f67daaca73da41e32ff6a58bde772c29b60676e85bcb2675bde3566585430051`

The prior archive is preserved at
`/root/archive/2026/09/13/resources-bunny-398f759-before-editor-frame.tar.gz`.
Follow the [manual staging instructions](../packages/website/README.md#update-an-existing-staging-deployment-manually).
Staging verification is distinct from these local build and browser checks.
