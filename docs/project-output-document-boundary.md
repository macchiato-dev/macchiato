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

## Proposed experiment, not implemented

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
  host currently recognizes only its own global `document` as a full-document
  target; some viewport/scroll/selection and font operations also use globals.
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
