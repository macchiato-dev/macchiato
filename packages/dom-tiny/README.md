# @macchiato-dev/dom-tiny

Minimal virtual DOM for server-side rendering, edge rendering, and testing.
Provides `VText`, `VElement`, and `VDocument` — a DOM-compatible API used by
the content and layout renderers.

Rendering to HTML is intentionally kept in a separate package,
[`render-html`](../render-html/README.md), so that environments which only
need to build or manipulate a DOM tree (without serialising it) can avoid
pulling in the serialisation code.
