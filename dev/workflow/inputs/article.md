# A workflow made of documents

The document contains **source, tests, and explanation**. Its external inputs
are pinned by SHA-256 rather than silently changing on the next build.

- Render a small Markdown subset.
- Highlight Rust with an independent scanner.
- Compose the results into a configurable layout.

## Code stays code

```rust
pub fn sum(values: &[u32]) -> u32 {
    // A small program, not a rendering dependency.
    values.iter().sum()
}
```

An [external link](https://example.com/) stays inert. So does raw markup:

<img src="https://example.com/tracker" onerror="alert(1)">
