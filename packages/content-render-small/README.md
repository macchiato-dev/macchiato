# @macchiato-dev/content-render-small

Creates/updates prose in the DOM using output from
[@macchiato-dev/content-parse-small][content-parse-small].

When it encounters an h1, it forwards the heading text to
[@macchiato-dev/layout-render-small][layout-render-small] as a `content_title` token.

## Hypertoken table

The input is a `Uint8Array`. The meaning of each byte is determined
by its bit pattern:

| First byte    | Pattern    | Meaning                                   |
|---------------|------------|-------------------------------------------|
| `0x00`        | `00000000` | Paragraph — followed by an inline token   |
|               |            | sequence terminated by `0x02`             |
| `0x01`        | `00000001` | Fenced code block — followed by two       |
|               |            | string tokens: the language identifier    |
|               |            | (may be empty) and the code content       |
| `0x02`        | `00000010` | End-of-inline — terminates the inline     |
|               |            | token sequence of a paragraph or header   |
| `0x08`–`0x0F` | `00001xxx` | Header — the lower 3 bits store the level |
|               |            | minus one, giving levels 1–8; followed by |
|               |            | an inline token sequence terminated by    |
|               |            | `0x02`. Levels 7–8 are non-standard       |
|               |            | extended headings                         |
| `0x10`        | `00010000` | Open `<em>` (italic)                      |
| `0x11`        | `00010001` | Close `</em>`                             |
| `0x18`        | `00011000` | Open `<strong>` (bold)                    |
| `0x19`        | `00011001` | Close `</strong>`                         |
| `0x9F`        | `10011111` | Empty string — zero UTF-8 bytes           |
| `0xA0`–`0xBF` | `101xxxxx` | Short string — the lower 5 bits store the |
|               |            | length minus one, giving a range of 1–32  |
|               |            | bytes, followed by that many UTF-8 bytes  |
| `0xC0`        | `11000000` | String8 — the next byte is the length     |
|               |            | (0–255), followed by that many UTF-8      |
|               |            | bytes                                     |
| `0xC1`        | `11000001` | String16 — the next 2 bytes are the       |
|               |            | length (big-endian, 0–65535), followed by |
|               |            | that many UTF-8 bytes                     |

This is the canonical definition of the hypertoken table for prose. In
code, the table is defined independently in both the parser and the
renderer — readers and writers each maintain their own copy.

## Supported elements

- [x] Headings
- [x] Paragraphs
- [x] Fenced code blocks
- [x] Title
- [ ] Links
- [ ] Link references
- [x] Bold, italics
- [ ] Images and iframes

## Supported configuration

- [ ] Allowed link, image, and iframe hosts
- [ ] Allow URLs likely to contain embedded data
- [ ] Advanced matching (pathname, query regexes) in allowed URLs
- [ ] Pluggable renderers for fenced code blocks (allowing advanced iframe
  renderer with overlay support)

[content-parse-small]: https://github.com/macchiato-dev/macchiato/tree/main/packages/content-parse-small
[layout-render-small]: https://github.com/macchiato-dev/macchiato/tree/main/packages/layout-render-small
