# Patterns: bounded scans and escaped spans

[Output primitives](01-output.md) · [Next: inline constructs](03-inline.md)

The same two loops recur in line scanning, inline code and links. Keeping them
as functions makes the actual byte lists easier to review. Neither helper
allocates memory, builds a token array or creates a parsed document tree.
All spans use half-open byte offsets, not Unicode character indices.

```text
find(p, end, byte):
    while p < end:
        if memory[p] == byte: return p
        p += 1
    return end
escaped(p, end):
    while p < end: text(memory[p++])
```

```mermaid
flowchart TD
    A[p, end] --> B{p less than end?}
    B -- No --> R[Done]
    B -- Yes --> C[Read one byte]
    C --> D[Compare or escape]
    D --> E[Advance p]
    E --> B
```

## Function 3: find

The end sentinel is also the not-found result. The loop checks the bound before
loading. Callers can distinguish a delimiter at the last byte from no delimiter
without an additional Boolean result. Parameters p, end, byte occupy 0..2.

`[microwasm]`

- find-record: `{{size:find-body}}`
  - find-body: `00`
    - find-exit: `02 40`
      - find-loop: `03 40`
        - find-bound: `20 00 20 01 4f 0d 01`
        - find-match: `20 00 2d 00 00 20 02 46 04 40 20 00 0f 0b`
        - find-next: `20 00 41 01 6a 21 00 0c 00 0b`
      - find-done: `0b`
    - find-result: `20 01 0b`

## Function 4: escaped span

This is used for code fences, inline code, link labels and link destinations.
It shares the escaping policy instead of duplicating it at every call site.

`[microwasm]`

- escaped-record: `{{size:escaped-body}}`
  - escaped-body: `00`
    - escaped-exit: `02 40`
      - escaped-loop: `03 40`
        - escaped-bound: `20 00 20 01 4f 0d 01`
        - escaped-byte: `20 00 2d 00 00 10 01`
        - escaped-next: `20 00 41 01 6a 21 00 0c 00 0b`
      - escaped-done: `0b 0b`

## Failed scans must still make progress

The inline parser consumes a scanned span even when it cannot recognize a
complete construct. If its terminator is missing, it emits the remainder
literally. This avoids repeatedly scanning the same suffix on malformed input
such as a long run of opening brackets. It is a deliberate partial-Markdown
rule, not a claim to implement CommonMark's delimiter algorithm.
