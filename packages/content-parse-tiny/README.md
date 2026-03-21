# @macchiato-dev/content-parse-tiny

Parses prose from a subset of Markdown.

Takes a Markdown content document and outputs a hypertoken stream as a
`Uint8Array`, which is read by [@macchiato-dev/content-render-tiny][content-render-tiny].

This will intentionally be minimal in what it parses.

The output is a `Uint8Array` hypertoken stream. The definition of the
token table is in [content-render-tiny][content-render-tiny-hypertokens].

[content-render-tiny]: https://github.com/macchiato-dev/macchiato/tree/main/packages/content-render-tiny
[content-render-tiny-hypertokens]: https://github.com/macchiato-dev/macchiato/tree/main/packages/content-render-tiny#hypertoken-table
