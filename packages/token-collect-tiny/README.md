# @macchiato-dev/token-collect-tiny

Scans one or more strings and builds a token dictionary for use with
[`token-parse-tiny`](../token-parse-tiny/README.md) and
[`token-render-tiny`](../token-render-tiny/README.md).

The dictionary maps strings to small integer indices. When a string is later
encoded by `token-parse-tiny`, segments that appear in the dictionary are
written as a single index byte rather than as a full inline string. The most
frequently seen tokens get the lowest indices, which keeps the common case
compact.

## What counts as a token

Tokens are non-empty strings. The collector operates at word or phrase
granularity — it splits input on whitespace boundaries and counts how often
each run appears. Callers can also supply explicit tokens (for example, a
fixed vocabulary of known phrases) regardless of observed frequency.

The `tiny` variant supports up to 127 dictionary entries (indices `0x00`–`0x7E`).
A `small` variant with a wider index range is planned.

## Hypertoken table

The dictionary itself is serialised as a `Uint8Array` for compact storage and
to allow the same bytes to be shipped to a browser or edge runtime without
further encoding. The format is a sequence of string tokens (using the shared
inline-string encoding below) terminated by `0x7F`.

| First byte    | Pattern    | Meaning                                   |
|---------------|------------|-------------------------------------------|
| `0x7F`        | `01111111` | End of dictionary                         |
| `0x9F`        | `10011111` | Empty string                              |
| `0xA0`–`0xBF` | `101xxxxx` | Short string — lower 5 bits = length − 1 |
|               |            | (1–32 bytes), followed by UTF-8 bytes     |
| `0xC0`        | `11000000` | String8 — next byte is length (0–255),    |
|               |            | followed by UTF-8 bytes                   |
| `0xC1`        | `11000001` | String16 — next 2 bytes are big-endian    |
|               |            | length (0–65535), followed by UTF-8 bytes |

The position of each string in the sequence is its index. Index 0 is the
first string after the start of the stream; index 1 is the second; and so on.

## API

```js
import { TokenCollector } from '@macchiato-dev/token-collect-tiny';

const collector = new TokenCollector();
collector.addText('the quick brown fox');
collector.addText('the fox jumped over the dog');
collector.addToken('the'); // ensure 'the' is always in the dictionary

const dict = collector.buildDictionary(); // Uint8Array
```

### `addText(string)`

Splits the string on whitespace and increments the count for each word.

### `addToken(string)`

Ensures the given string appears in the dictionary regardless of observed
frequency. Useful for seeding a fixed vocabulary.

### `buildDictionary()` → `Uint8Array`

Returns the serialised dictionary. Entries are ordered by descending
frequency; ties are broken lexicographically. At most 127 entries are
included (the `tiny` limit). Explicit tokens added via `addToken` are
placed before frequency-ranked tokens.
