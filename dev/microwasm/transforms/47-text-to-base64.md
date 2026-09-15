# UTF-8 text to Base64 bytes

Tool 47 encodes the bytes of a `text` fence with the standard Base64 alphabet,
including required padding and no inserted line wraps. It shares the
[decoder module](46-base64-to-text.md), exporting its `encode` entry as `run`.

```text
Hello, world!
```

becomes:

```base64
SGVsbG8sIHdvcmxkIQ==
```

Exactly one LF before the closing text fence is framing. Add another there
to encode a final newline. BOM, controls and normalization remain unchanged;
the text must be valid UTF-8. Base64 describes bytes, not Unicode code points.
The shared implementation documents grouping, padding, capacity checks and
longer fences. This adapter neither copies input nor adds a second codec.

Instantiate the number memory `n`, span helper `c`, hex module `h`, Base64
module `b`, then this adapter with `b`. Input is at most 64 KiB; all modules
share four fixed pages and return output at `0x10000`. The adapter's size
excludes its dependencies. Failed calls publish no output length.

`[microwasm]`

- tb-header: `0061736d 01000000`
- tb-type-section: `01 {{size:tb-types}}`
  - tb-types: `01 60 01 7f 01 7f`
- tb-import-section: `02 {{size:tb-imports}}`
  - tb-imports: `02 01 62 06 656e636f6465 00 00 01 62 06 6d656d6f7279 02 01 04 04`
- tb-export-section: `07 {{size:tb-exports}}`
  - tb-exports: `02 03 72756e 00 00 06 6d656d6f7279 02 00`
