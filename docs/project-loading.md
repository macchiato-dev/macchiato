# Project loading: QuickJS migration

The website and project guests are moving to QuickJS, with idiomatic ES6+
source. MicroQuickJS compatibility transformations are not the desired end
state. The browser controller continues to wire capabilities, not run the
application or CodeMirror in the browser realm.

## Acceptance targets

- Mahjong is visibly playable within three seconds of navigation. Measure
  the actual signed-in project, not only a standalone demo or a ready flag.
- Keep the game code clear and modern without changing its gameplay.
- Load CodeMirror dynamically, independently of the output. Its language
  modules remain demand-loaded and share the same core instances.
- Move the site and project UI guests to QuickJS as well.
- Add a REST client example with request editing and response inspection,
  within explicitly granted network capabilities.
- Replace circular project loading spinners with a quiet, slow indicator;
  respect reduced motion and retain one indicator per loading pane.

## Initial measurements, 2026-10-07

Chromium, 1440 by 900, fresh authenticated browser contexts, local server;
three navigations to `/benatkin/classic-chinese-mahjong`:

- 144 visible tiles: 5.30, 5.03, 5.31 seconds.
- Editor ready: 5.85, 5.52, 5.84 seconds.

After moving only the outer frontend to QuickJS, the workspace request
still takes several seconds and returns about 1.2 MB. Source inspection
shows this request traverses the policy, application, and server machines.
Measure those boundaries before changing the transport. The stored last
successful build already avoids compiling the project on the opening path;
preserve that behavior and draft recovery.

The next probe isolated workspace retrieval without changing the database.
Repeated calls took 4.28–5.21 seconds, including 0.92–0.99 seconds in the
policy/database round trips. Replacing interpreted per-byte UTF-8 loops with
QuickJS's native string conversion reduced warm calls to 0.48–0.52 seconds
(the first call took 1.80 seconds). This keeps the byte protocol unchanged and
does not grant another host capability. Large strings, embedded NUL, Unicode,
and lone-surrogate replacement are covered by the server-runtime test.

The frontend and project controls now use QuickJS. The editor runtime contains
the DOM environment, not CodeMirror. Its controller downloads separate trusted
QuickJS bytecode for the editor core (727 KB), surface integration (1.3 KB),
and workspace controls (116 KB); the workspace context never loads the core.
Grammars load only when selected. No application program executes in the
browser realm. The shipped-artifact test recompiles each program, and the
browser surface test covers editing, undo/redo, search, theme changes, and
language changes.

The old MicroQuickJS comparison tests now build their own ignored fixtures in
`packages/project-editor/generated/`. They no longer consume the website's
runtime or programs. Their DOM-realm and language-loading checks remain useful
for that engine, but are not the production site acceptance test.

After the server conversion and frontend/editor migration, three fresh browser
contexts with no concurrent builds measured 144 visible Mahjong tiles at
1.63, 1.14, and 1.05 seconds, and editor readiness at 2.08, 1.58, and 1.49
seconds. This meets the local timing target in these samples, not a staging
latency guarantee. A run competing with C/Babel builds was substantially slower;
do not mix build load into before/after application comparisons.

A second three-load run measured 1.65, 1.37, and 1.27 seconds for the board.
Playwright then clicked all 72 matching pairs in the actual signed-in output
iframe, observed the win message and empty board, and started a new 144-tile
game. No page errors were reported. Screenshots and raw timing logs are kept
outside the repository in `/root/macchiato-work/design-refresh/`.

Project-level checks also cover Markdown grammars, Find/Replace in both themes,
and titled saves/history. The save/reload test caught a cached-output ordering
bug: when a session draft exists, the editor must recover it before any saved
output is mounted. The cache remains the initial path only without recovery.

## Final example checks

Mahjong now uses two ordinary ES modules. Its model accepts state explicitly,
and its UI loads resources with `async`/`await`. Initial image templates cross
the bridge once per source and are cloned with the normal DOM API; selecting
a tile only changes affected states, not all 144 image URLs and positions.
Existing gameplay and the user's other project files were preserved. The
saved output was regenerated in the Wasm build guest for the new source.

After that change, a three-context local run measured the visible board at
2.67, 2.57, and 1.93 seconds, and editor readiness at 4.01, 3.42, and 2.99
seconds. The first context also completed all 72 pairs, reached the win
state, and started a fresh game. The immediately preceding run had two
loads above three seconds; retain those logs rather than presenting the
fastest sample as a universal guarantee. These final samples meet the local
target; staging still needs its own latency measurements.

`/benatkin/rest-client` is the new REST Desk project, with portable source in
`examples/rest-client/`. Browser tests cover JSON POST, response headers,
HTTP 422, displaying response HTML as text, blocked origins, recovery, and
session draft restoration. A real HTTPS endpoint was also exercised with
GET and POST. Request bodies and response streams have size limits; ambient
credentials, referrers, redirects and ungranted origins remain blocked.
The shared controller adapter is `packages/website/project-fetch.js`.

The editor surface regression covers input, commands, themes, and languages.
Mahjong ZIP import/export still renders the modern example. Screenshots were
inspected for the board, REST Desk in light/dark modes, and the two separate
loading indicators. All timing and
screenshot instrumentation stays outside the production controller, under
`/root/macchiato-work/design-refresh/`.

## Pane loading indicator

The opacity pulse did not read as loading, so each pane now shows a 46 by 32
pixel frame whose fill grows from the left and then empties toward the right:
repeating progress rather than rotation. It appears after 150 ms, so fast
loads do not flash it. With reduced motion, the filled frame only pulses its
opacity. The frame and fill use the theme's `--track-border` and `--muted`.
Both are pseudo-elements of the existing `.project-editor__pane-loading`
overlay, so the markup and its one-indicator-per-pane checks are unchanged.

The style-use schema now allows `cubic-bezier()` animation timing and `%` in
keyframe step selectors (its parser checks every step after the first as a
selector). Screenshots of both themes and reduced motion are in
`/root/macchiato-work/loader-design/`.
