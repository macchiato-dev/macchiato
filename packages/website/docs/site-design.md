# Resources.co site design

The October 2026 Claude Design export is a visual reference, not a replacement
frontend. Adapt its layout and components to the existing server-rendered pages
and guest-owned interactions. Do not introduce Vue/React on the browser host,
invent deployment features from mockup copy, or replace working forms with
decorative controls.

## Regular site

- Warm neutral light and dark palettes; ink-colored primary actions.
- Instrument Sans for the interface, JetBrains Mono for code and identifiers.
- A compact wordmark and navigation header, generous landing-page introduction,
  and a centered reading column for articles and informational pages.
- Account pages use a left navigation column and the existing project and
  organization actions. At narrow widths navigation moves above the content.
- Four-pixel control corners, six-pixel cards and menus, hairline borders.
  Elevation belongs to popovers, not every section of a page.
- Keyboard focus remains visible. Reduced-motion settings suppress control
  transitions. Theme and language selectors retain their current behavior.

`design-system.css` adapts the supplied tokens to the current site variables.
The neutral colors are sRGB equivalents of the reference's OKLCH palette.
Fonts are bundled into static artifacts, with their licenses in
`assets/fonts/design/`.

## Project workspace

`editor-design.css` adapts the same visual language at editing density rather
than applying landing-page spacing. Instrument Sans, warm neutral surfaces,
four-pixel controls, and six-pixel menus connect it to the rest of the site.
The editor uses a softer charcoal in dark mode and warm off-white in light
mode. Syntax colors and a restrained blue selection remain distinct from UI
selection; active tabs and pane controls have both a surface and border change.

Keep the existing 54px app bar, 48px project toolbar, 30px icon controls, tab
overflow behavior, two-pixel dividers and larger splitter hit targets. Do not
add padding around CodeMirror: its own content padding is sufficient. The
editor theme variables in `seed.js` also reach its isolated frame, including
Find/Replace, gutters, caret, and selection. Keep the code font's existing
metrics rather than introducing a font-loading-dependent layout change.

The workspace adapter follows `.focused-view` through client navigation and
styles first paint before any guest starts. Output applications and embeds
remain responsible for their own colors and typography. Never recolor a game
or document simply to match the surrounding editor.

A `resources-workspace` head marker supplies the initial palette before the
streamed layout has arrived. It stops influencing the theme once a layout
exists, so it cannot leak workspace colors into later client-side navigation.

Check both themes, signed-in and signed-out home, article pages, account menus,
forms, and small screens when changing the design. In the workspace, check
typing, selection, undo/redo, search, tabs, pane sizing, menus, and expanded
output. Theme changes must reach the live editor without resetting its state.
