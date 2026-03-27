# @macchiato-dev/token-render-tiny

Decodes a hypertoken stream (produced by
[`token-parse-tiny`](../token-parse-tiny/README.md)) back into a string, using
the same dictionary that was used to encode it.

## API

```js
import { TokenRenderer } from '@macchiato-dev/token-render-tiny';

const renderer = new TokenRenderer(dict); // dict is a Uint8Array from token-collect-tiny
const text = renderer.render(encoded);    // string
```

### `new TokenRenderer(dictionary)`

Accepts a serialised dictionary `Uint8Array`. Decodes it once on construction.

### `render(Uint8Array)` → `string`

Walks the hypertoken stream. Each dictionary-reference byte (`0x00`–`0x7E`) is
looked up in the dictionary and its string appended to the output. Each inline
string token is decoded directly. The stream ends at `0x7F`.

See [`token-parse-tiny`](../token-parse-tiny/README.md) for the full hypertoken
table.
