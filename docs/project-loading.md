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

These are exploratory observations, not completion evidence or Bunny latency
claims. Final checks need repeated loads, interactive play, editor input and
undo, theme changes, and the new REST client, with screenshots and errors
recorded. Keep benchmark instrumentation outside the production controller.
