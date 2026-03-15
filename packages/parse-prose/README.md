# @macchiato-dev/parse-prose

Parses prose from a subset of Markdown.

Takes a Markdown content document and outputs a hypertoken stream as a
`Uint8Array`, which is read by [@macchiato-dev/render-prose][render-prose].

This will intentionally be minimal in what it parses.

The output is a `Uint8Array` hypertoken stream. The definition of the
token table is in [render-prose][render-prose-hypertokens].

[render-prose]: https://github.com/macchiato-dev/macchiato/tree/main/packages/render-prose
[render-prose-hypertokens]: https://github.com/macchiato-dev/macchiato/tree/main/packages/render-prose#hypertoken-table
