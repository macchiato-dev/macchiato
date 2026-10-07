# Mahjong Solitaire

A portable Resources project running modern JavaScript inside QuickJS.
Import `index.html`, the two JavaScript modules, `style.css`, `tiles/`, and
`icons/` together. Keep the files in the project; no CDN is needed at runtime.

`game-model.js` owns the turtle positions, shuffle, matching rules, and names.
Its functions take their state explicitly. `removalOrder` describes a valid
sequence of pairs in the geometry, not fixed tile identities; each new game
shuffles identities onto that layout. `application.js` owns input, settings,
and rendering. It loads local resources concurrently with `async`/`await`.

Artwork and placement are set once per game. A selection/removal redraw only
changes the affected button states. Image templates use ordinary DOM cloning,
so each source crosses the Wasm bridge once, not once per tile. The runtime's
`response.resourceUrl()` returns a checked data
URL for a project file; this is the one deliberate extension to browser fetch.

The example preserves the existing gameplay and appearance. Model checks live
in `packages/website/test/mahjong-model.test.js`; project import/export and
browser rendering are exercised by the website integration tests.

## Credits

- Tile artwork: [FluffyStuff/xhokir](https://github.com/xhokir/riichi-mahjong-tiles), CC BY 4.0.
- Settings and undo icons: [Lucide](https://lucide.dev), ISC.
