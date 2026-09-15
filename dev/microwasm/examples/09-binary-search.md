# Binary search

Search a sorted signed-i32 array at offset zero. `run(count, target)` returns
an index or -1. With duplicates, any matching index is acceptable. Sorting is
a caller precondition; the function checks the count, not the entire array.

```text
run(count, target):
    if u32(count) > 0x4000: trap
    low = 0; high = count
    while low < high:
        middle = low + ((high - low) >> 1)
        value = load_i32(middle << 2)
        if value == target: return middle
        if value < target: low = middle + 1
        else: high = middle
    return -1
```

```mermaid
flowchart TD
    V{Unsigned count at most 0x4000?} -- No --> X[Trap before any load]
    V -- Yes --> A[low = 0; high = count]
    A --> B{low less than high?}
    B -- No --> N[Return -1]
    B -- Yes --> M[middle = low + half of high minus low]
    M --> C[Load signed i32 at middle times 4]
    C --> D{value equals target?}
    D -- Yes --> R[Return middle]
    D -- No --> E{value less than target, signed?}
    E -- Yes --> U[low = middle + 1; high unchanged]
    E -- No --> L[high = middle; low unchanged]
    U --> B
    L --> B
```

## The two-argument signature

The search range is half-open: high may equal count but is never loaded.
Keeping indices bounded also makes the middle calculation safe.

`[microwasm]`

- header: `0061736d 01000000`
- type-section: `01 {{size:types}}`
  - types: `01 60 02 7f 7f 01 7f`
- function-section: `03 {{size:functions}}`
  - functions: `01 00`
- memory-section: `05 {{size:memories}}`
  - memories: `01 01 01 01`
- export-section: `07 {{size:exports}}`
  - exports: `02 03 72756e 00 00 06 6d656d6f7279 02 00`

## Halve the interval

Parameters count and target occupy 0 and 1; low, high, middle, value occupy
2 through 5. `05` separates the two arms of an if. Every non-returning arm
makes the interval strictly smaller, including when it contains one item.

The comparison domains are deliberately different. `bounds` and `empty`
compare unsigned indices; negative counts become large unsigned values and
trap. `upper-half` compares signed array values, so a negative value belongs
before a positive one. Neither branch loads at `high`: it is the excluded
end of the surviving interval, not the last candidate's index.

For `[-7, -2, 4, 4, 9, 15]`, searching for the absent value 5 takes this path:

| Step | Candidate interval | Middle and value | Next interval |
| --- | --- | --- | --- |
| 1 | `[0, 6)` | Index 3, value 4 | `[4, 6)`; exclude middle and everything below |
| 2 | `[4, 6)` | Index 5, value 15 | `[4, 5)`; exclude middle and everything above |
| 3 | `[4, 5)` | Index 4, value 9 | `[4, 4)`; no candidates remain |

The next `empty` branch jumps out of `exit`, then `missing` supplies -1.
It does not run a final load. Searching for 4 instead returns index 3 in the
first iteration, directly from `found`; it does not keep scanning left for
the first duplicate. An empty input takes the same no-load exit immediately.

At `repeat`, branch depth 0 names the loop. At `empty`, branch depth 1 names
the enclosing exit block. The `return` in `found` leaves the whole function.
These are three different control transfers, not three spellings of break.

`[microwasm]`

- code-section: `0a {{size:code}}`
  - code: `01 {{size:body}}`
    - body: `01 04 7f`
      - bounds: `20 00 41 808001 4b 04 40 00 0b`
      - high: `20 00 21 03`
      - exit: `02 40`
        - loop: `03 40`
          - empty: `20 02 20 03 4f 0d 01`
          - middle: `20 02 20 03 20 02 6b 41 01 76 6a 21 04`
          - value: `20 04 41 02 74 28 02 00 21 05`
          - found: `20 05 20 01 46 04 40 20 04 0f 0b`
          - upper-half: `20 05 20 01 48 04 40`
            - low: `20 04 41 01 6a 21 02`
            - else: `05`
            - lower-half: `20 04 21 03 0b`
          - repeat: `0c 00 0b`
        - exit-end: `0b`
      - missing: `41 7f 0b`

Check both ends, misses inside and outside the range, duplicates, and emptiness.
