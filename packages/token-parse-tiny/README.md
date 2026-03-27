# @macchiato-dev/token-parse-tiny

Encodes a string as a compact hypertoken stream using a dictionary produced by
[`token-collect-tiny`](../token-collect-tiny/README.md). The output can be
decoded back to the original string by
[`token-render-tiny`](../token-render-tiny/README.md).

## Encoding

The parser scans the input string left to right, greedily matching the longest
dictionary entry at each position. A matched entry is written as its one-byte
index. Any portion of the input that has no dictionary match is written as an
inline string token. The sequence is terminated by `0x7F`.

## Hypertoken table

| First byte    | Pattern    | Meaning                                   |
|---------------|------------|-------------------------------------------|
| `0x00`–`0x7E` | `0xxxxxxx` | Dictionary reference — the 7-bit value is |
|               |            | the index into the dictionary             |
| `0x7F`        | `01111111` | End of sequence                           |
| `0x9F`        | `10011111` | Inline empty string                       |
| `0xA0`–`0xBF` | `101xxxxx` | Inline short string — lower 5 bits =      |
|               |            | length − 1 (1–32 bytes), UTF-8 bytes      |
|               |            | follow                                    |
| `0xC0`        | `11000000` | Inline String8 — next byte is length      |
|               |            | (0–255), UTF-8 bytes follow               |
| `0xC1`        | `11000001` | Inline String16 — next 2 bytes are        |
|               |            | big-endian length (0–65535), UTF-8 bytes  |
|               |            | follow                                    |

## API

```js
import { TokenParser } from '@macchiato-dev/token-parse-tiny';

const parser = new TokenParser(dict); // dict is a Uint8Array from token-collect-tiny
const encoded = parser.parse('the quick brown fox');  // Uint8Array
```

### `new TokenParser(dictionary)`

Accepts a serialised dictionary `Uint8Array` as produced by
`token-collect-tiny`. Decodes it once on construction and builds an index for
fast greedy matching.

### `parse(string)` → `Uint8Array`

Encodes the string and returns the hypertoken stream.
