# @macchiato-dev/content-parse-small

Parses prose from a subset of Markdown.

Takes a Markdown content document and outputs a hypertoken stream as a
`Uint8Array`, which is read by [@macchiato-dev/content-render-small][content-render-small].

This will intentionally be minimal in what it parses.

The output is a `Uint8Array` hypertoken stream. The definition of the
token table is in [content-render-small][content-render-small-hypertokens].

[content-render-small]: https://github.com/macchiato-dev/macchiato/tree/main/packages/content-render-small
[content-render-small-hypertokens]: https://github.com/macchiato-dev/macchiato/tree/main/packages/content-render-small#hypertoken-table
