# UTF-8 text to hexadecimal bytes

Tool 45 reads a `text` fence and writes lowercase hexadecimal byte pairs,
sixteen bytes per line. It is a byte conversion, not a code-point listing:
`é` becomes `c3 a9`, and its decomposed form becomes `65 cc 81`.
No Unicode normalization takes place.

```text
Hello, 世界!
```

becomes:

```hex
48 65 6c 6c 6f 2c 20 e4 b8 96 e7 95 8c 21
```

As in the [decoder](44-hex-to-text.md), the single LF before the closing
fence is framing, not text. Add an extra LF there to encode a final newline.
Spaces, tabs, CR and BOM are data. Empty text produces an empty hex body.
Longer fences allow literal backticks. There is no trimming or escape syntax
inside the text. The shared fence reader validates raw UTF-8 before encoding.

The encoder's loop, framing algorithm, boundary checks and visible bytes are
documented with the decoder. This module only imports its `encode` function
and exports it as `run`; there is no separate implementation or allocation.
Both directions share four fixed pages. Input is at most 64 KiB and output
at most 128 KiB; spaced hex expansion can exceed that output bound. A failed
call must not replace the caller's last successful result.

Instantiate `n`, `c`, the decoder as `h`, then this adapter using `h`.
Its small size excludes those dependencies and their memory.

`[microwasm]`

- th-header: `0061736d 01000000`
- th-type-section: `01 {{size:th-types}}`
  - th-types: `01 60 01 7f 01 7f`
- th-import-section: `02 {{size:th-imports}}`
  - th-imports: `02 01 68 06 656e636f6465 00 00 01 68 06 6d656d6f7279 02 01 04 04`
- th-export-section: `07 {{size:th-exports}}`
  - th-exports: `02 03 72756e 00 00 06 6d656d6f7279 02 00`
