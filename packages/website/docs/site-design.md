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

## Project workspace exception

Do not apply this redesign to the project/editor page yet. Every new theme and
component rule excludes `.focused-view` and `.embed-view`, including rules on
`html` and `body`. The workspace keeps its blue themes, typography, split panes,
toolbars, editor, and output. The selector follows the actual page layout, so
it also works when the application navigates without reloading the document.

Check both themes, signed-in and signed-out home, article pages, account menus,
forms, and small screens when changing the design. Compare project-page styles
before and after; a general-site change must not alter the workspace.
