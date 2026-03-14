# @macchiato-dev/render-layout

Creates/updates layout in the DOM using output from
[@macchiato-dev/parse-layout][parse-layout].

## Current behavior

Takes a `Uint8Array` hypertoken stream and applies it to the DOM.
Currently reads the title token and sets the document `<title>`.
The renderer is responsible for sanitization and maintains its own
string table for that purpose.

### Hypertoken table

The input is a `Uint8Array`. The meaning of each byte is determined
by its bit pattern:

| First byte    | Pattern    | Meaning                                   |
|---------------|------------|-------------------------------------------|
| `0x00`        | `00000000` | Title — the next token is the title       |
| `0xC0`–`0xFF` | `11XXXXXX` | Inline string — the lower 6 bits store    |
|               |            | the length minus one, giving a range of   |
|               |            | 1–64 bytes, followed by that many UTF-8   |
|               |            | bytes. Titles longer than 64 characters   |
|               |            | are not supported.                        |

For example, a document titled `Hello` would produce:

```
0x00 0xC4 H e l l o
```

- `0x00`: title follows
- `0xC4`: inline string, length = `(0xC4 & 0x3F) + 1` = `4 + 1` = 5
- `Hello`: the 5 UTF-8 bytes of the title

This documents the hypertoken table for layout. In code, the table is
defined independently in both the parser and the renderer — readers and
writers each maintain their own copy.

[parse-layout]: https://github.com/macchiato-dev/macchiato/tree/main/packages/parse-layout
