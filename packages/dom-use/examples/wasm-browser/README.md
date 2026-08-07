# Browser WebAssembly example

This static example imports the bundled `dom-use` host surface and
`quickjs-emscripten` from jsDelivr, fetches the self-contained guest runtime,
and runs a small DOM program inside QuickJS WebAssembly.

Serve this directory over HTTP after `@macchiato-dev/dom-use@0.1.0` is
published, then open `index.html`. For local package development, map the two
`@macchiato-dev/dom-use` URLs in `main.js` to the generated files under `lib/`.

The CDN is only transport. The schema in `main.js` remains the authority: it
allows one application root, a heading, and paragraphs, with no URL-bearing
attributes or network-capable elements.
