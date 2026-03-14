# @macchiato-dev/parse-layout

Parses layout info from a subset of Markdown.

This takes a Markdown content document and outputs a hypertoken stream
as a Uint8Array which is read by the renderer and applied to the web
web page. This can be a blank web page which it will create or an
existing web page which it will update. Currently, only the document
title is extracted — read from the top-level heading (`# ...`) — and
output as a title token followed by a string token.

The output is a `Uint8Array` hypertoken stream. The definition of the
token table is in [render-layout][render-layout-hypertokens].

## Planned

parse-layout will accept a pre-parsed config object (loaded from a
`config.md` configuration document) so the layout definition does
not need to be re-read on each call. It will also accept the file
path of the content document.

[render-layout-hypertokens]: https://github.com/macchiato-dev/macchiato/tree/main/packages/render-layout#hypertoken-table
