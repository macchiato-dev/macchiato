# @macchiato-dev/render-layout

Creates/updates layout in the DOM using output from
[@macchiato-dev/parse-layout][parse-layout].

This layout will be configurable enough to support a wide variety of
pages while still being constrained. It will sanitize not just the
schema but the behavior. For instance it will support customizing the
background but will require contrast.

Also receives `content_title` from [@macchiato-dev/render-prose][render-prose]
when that renderer encounters an h1.

## Current behavior

Takes a `Uint8Array` hypertoken stream and applies it to the DOM.
Currently reads the site title and content title tokens and sets the
document `<title>`. The renderer is responsible for sanitization and
maintains its own string table for that purpose.

### Hypertoken table

The input is a `Uint8Array`. The meaning of each byte is determined
by its bit pattern:

| First byte    | Pattern    | Meaning                                   |
|---------------|------------|-------------------------------------------|
| `0x00`        | `00000000` | Site title — the next token is the title  |
|               |            | from the layout config                    |
| `0x01`        | `00000001` | Content title — the next token is the     |
|               |            | title from the prose (e.g. the h1),       |
|               |            | forwarded by render-prose                 |
| `0xC0`–`0xFF` | `11XXXXXX` | Inline string — the lower 6 bits store    |
|               |            | the length minus one, giving a range of   |
|               |            | 1–64 bytes, followed by that many UTF-8   |
|               |            | bytes. Titles longer than 64 characters   |
|               |            | are not supported.                        |

For example, a layout config with `- title: My Site` and a prose h1
of `Hello` would produce:

```
0x00 0xC6 M y   S i t e
0x01 0xC4 H e l l o
```

- `0x00`: site title follows
- `0xC6`: inline string, length = `(0xC6 & 0x3F) + 1` = `6 + 1` = 7
- `My Site`: the 7 UTF-8 bytes of the site title
- `0x01`: content title follows
- `0xC4`: inline string, length = `(0xC4 & 0x3F) + 1` = `4 + 1` = 5
- `Hello`: the 5 UTF-8 bytes of the content title

This is a shared description of the hypertoken table for layout. In
code, the table is defined independently in both the parser and the
renderer — readers and writers each maintain their own copy.

[parse-layout]: https://github.com/macchiato-dev/macchiato/tree/main/packages/parse-layout
[render-prose]: https://github.com/macchiato-dev/macchiato/tree/main/packages/render-prose
