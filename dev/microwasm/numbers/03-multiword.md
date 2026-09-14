# Exact multiword arithmetic for number conversion

Decimal-to-binary64 conversion needs one correctly rounded result, not a
sequence of rounded digit accumulations. This small unsigned arithmetic layer
lets the next parser represent a decimal as an exact integer ratio. The
formatter can reuse it for decimal/radix digits and rounding boundaries.
This page is arithmetic infrastructure, not a completed floating-point API.

It imports memory from the JSON-number module. Four fixed scratch slots begin
at `0x31000`, separated by `0x800` bytes. Each contains a u32 limb count followed
by at most 256 little-endian u32 limbs, least significant first. Zero has count
zero. The highest used limb is nonzero. Length is explicit; zero-valued limbs
inside a number are ordinary data, not terminators.

Only slot numbers 0..3 are accepted. All operations normalize their result.
Capacity overflow or unsigned subtraction underflow traps; the caller must
reset scratch before retrying. Unused limbs need not be cleared because the
length controls every read. No allocator, recursion or host arithmetic is used.

## Operations

- `set(slot, value)` sets a u32 value.
- `copy(destination, source)` copies a normalized value; self-copy is valid.
- `muladd(slot, multiplier, addend)` computes n × multiplier + addend exactly.
- `shl(slot, count)` multiplies by a power of two, with count at most 8192.
- `shr(slot)` shifts right by one bit.
- `cmp(a, b)` returns -1, 0 or 1.
- `sub(a, b)` subtracts b from a; a must be at least b. Aliasing is allowed.
- `add(a, b)` adds b to a. Aliasing is allowed; overflow traps.
- `bits(slot)` returns zero for zero, otherwise the bit length.
- `divrem(slot, divisor)` replaces the value with its unsigned quotient and
  returns the u32 remainder. A zero divisor traps before writing anything.

The first shift-left implementation deliberately reuses `muladd(slot, 2, 0)`.
It is easy to audit and bounded. A word-wise shift can replace this later if
measurement shows that repeated limb passes matter for number conversion.

```text
muladd(slot, multiplier, addend):
    carry = u64(addend)
    for each little-endian limb:
        product = u64(limb) * multiplier + carry
        limb = low32(product)
        carry = product >>> 32
    append carry if nonzero, checking capacity
    trim high zero limbs

sub(a, b):
    require a >= b
    borrow = 0
    for each limb of a:
        difference = u64(a_limb) - b_limb_or_zero - borrow
        a_limb = low32(difference)
        borrow = difference >>> 63
    trim high zero limbs

divrem(slot, divisor):
    require divisor != 0
    remainder = 0
    for each limb, highest first:
        combined = (u64(remainder) << 32) | limb
        limb = combined / divisor
        remainder = combined % divisor
    trim high zero limbs
    return remainder
```

The multiply/add maximum fits u64 exactly. A subtraction step lies between
−2³² and 2³²−1, so bit 63 identifies a borrow without a signed overflow test.
Comparison walks from the highest limb, while carry and borrow walk from the
lowest. These opposite traversal directions are intentional. In division the
remainder is always below the divisor, so the combined value fits u64 and each
quotient limb fits u32, including a divisor of `0xffffffff`.

```mermaid
flowchart LR
    A[Validate slot and limb count] --> B[Operate on used limbs]
    B --> C[Propagate carry or borrow]
    C --> D[Normalize high zero limbs]
    D --> E[Explicit-length result]
```

## Module

Functions: pointer 0, trim 1, set 2, copy 3, muladd 4, shl 5, shr 6, cmp 7,
sub 8, bits 9, divrem 10, add 11. Pointer and trim are private. Types are one-i32-to-i32 (0),
one-i32-to-void (1), two-i32-to-void (2), three-i32-to-void (3), and
two-i32-to-i32 (4).

`[microwasm]`

- mw-header: `0061736d 01000000`
- mw-type-section: `01 {{size:mw-types}}`
  - mw-types: `05 60 01 7f 01 7f 60 01 7f 00 60 02 7f 7f 00 60 03 7f 7f 7f 00 60 02 7f 7f 01 7f`
- mw-import-section: `02 {{size:mw-imports}}`
  - mw-imports: `01 01 6e 06 6d656d6f7279 02 01 04 04`
- mw-function-section: `03 {{size:mw-functions}}`
  - mw-functions: `0c 00 01 02 02 03 02 01 04 02 00 04 02`
- mw-export-section: `07 {{size:mw-exports}}`
  - mw-exports: `0b 03 736574 00 02 04 636f7079 00 03 06 6d756c616464 00 04 03 73686c 00 05 03 736872 00 06 03 636d70 00 07 03 737562 00 08 04 62697473 00 09 06 64697672656d 00 0a 03 616464 00 0b 06 6d656d6f7279 02 00`
- mw-code-section: `0a {{size:mw-code}}`
  - mw-code: `0c`
    - mw-pointer-record: `{{size:mw-pointer-body}}`
      - mw-pointer-body: `01 01 7f`
        - mw-pointer-slot: `20 00 41 04 4f 04 40 00 0b`
        - mw-pointer-address: `20 00 41 0b 74 41 80a00c 6a 21 01`
        - mw-pointer-length: `20 01 28 02 00 41 8002 4b 04 40 00 0b`
        - mw-pointer-result: `20 01 0b`
    - mw-trim-record: `{{size:mw-trim-body}}`
      - mw-trim-body: `01 01 7f`
        - mw-trim-length: `20 00 28 02 00 21 01`
        - mw-trim-exit: `02 40`
          - mw-trim-loop: `03 40`
            - mw-trim-zero: `20 01 45 0d 01`
            - mw-trim-high: `20 00 20 01 41 02 74 6a 28 02 00 0d 01`
            - mw-trim-next: `20 01 41 01 6b 21 01 0c 00 0b`
          - mw-trim-end: `0b`
        - mw-trim-store: `20 00 20 01 36 02 00 0b`
    - mw-set-record: `{{size:mw-set-body}}`
      - mw-set-body: `01 01 7f`
        - mw-set-pointer: `20 00 10 00 21 02`
        - mw-set-length: `20 02 20 01 45 45 36 02 00`
        - mw-set-word: `20 02 20 01 36 02 04 0b`
    - mw-copy-record: `{{size:mw-copy-body}}`
      - mw-copy-body: `01 04 7f`
        - mw-copy-pointers: `20 00 10 00 21 02 20 01 10 00 21 03`
        - mw-copy-length: `20 03 28 02 00 21 04 20 02 20 04 36 02 00`
        - mw-copy-exit: `02 40`
          - mw-copy-loop: `03 40`
            - mw-copy-bound: `20 05 20 04 4f 0d 01`
            - mw-copy-word: `20 02 20 05 41 02 74 6a 20 03 20 05 41 02 74 6a 28 02 04 36 02 04`
            - mw-copy-next: `20 05 41 01 6a 21 05 0c 00 0b`
          - mw-copy-end: `0b 0b`
    - mw-muladd-record: `{{size:mw-muladd-body}}`
      - mw-muladd-body: `02 03 7f 02 7e`
        - mw-muladd-pointer: `20 00 10 00 21 03 20 03 28 02 00 21 04`
        - mw-muladd-carry: `20 02 ad 21 06`
        - mw-muladd-exit: `02 40`
          - mw-muladd-loop: `03 40`
            - mw-muladd-bound: `20 05 20 04 4f 0d 01`
            - mw-muladd-product: `20 03 20 05 41 02 74 6a 28 02 04 ad 20 01 ad 7e 20 06 7c 21 07`
            - mw-muladd-low: `20 03 20 05 41 02 74 6a 20 07 a7 36 02 04`
            - mw-muladd-high: `20 07 42 20 88 21 06`
            - mw-muladd-next: `20 05 41 01 6a 21 05 0c 00 0b`
          - mw-muladd-end: `0b`
        - mw-muladd-append: `20 06 42 00 52 04 40`
          - mw-muladd-capacity: `20 04 41 8002 4f 04 40 00 0b`
          - mw-muladd-carry-word: `20 03 20 04 41 02 74 6a 20 06 a7 36 02 04`
          - mw-muladd-length: `20 03 20 04 41 01 6a 36 02 00 0b`
        - mw-muladd-trim: `20 03 10 01 0b`
    - mw-shl-record: `{{size:mw-shl-body}}`
      - mw-shl-body: `00`
        - mw-shl-count: `20 01 41 80c000 4b 04 40 00 0b`
        - mw-shl-slot: `20 00 10 00 1a`
        - mw-shl-exit: `02 40`
          - mw-shl-loop: `03 40`
            - mw-shl-bound: `20 01 45 0d 01`
            - mw-shl-double: `20 00 41 02 41 00 10 04`
            - mw-shl-next: `20 01 41 01 6b 21 01 0c 00 0b`
          - mw-shl-end: `0b 0b`
    - mw-shr-record: `{{size:mw-shr-body}}`
      - mw-shr-body: `01 04 7f`
        - mw-shr-pointer: `20 00 10 00 21 01 20 01 28 02 00 21 02`
        - mw-shr-exit: `02 40`
          - mw-shr-loop: `03 40`
            - mw-shr-bound: `20 02 45 0d 01`
            - mw-shr-word: `20 01 20 02 41 02 74 6a 28 02 00 21 04`
            - mw-shr-write: `20 01 20 02 41 02 74 6a 20 04 41 01 76 20 03 41 1f 74 72 36 02 00`
            - mw-shr-carry: `20 04 41 01 71 21 03`
            - mw-shr-next: `20 02 41 01 6b 21 02 0c 00 0b`
          - mw-shr-end: `0b`
        - mw-shr-trim: `20 01 10 01 0b`
    - mw-cmp-record: `{{size:mw-cmp-body}}`
      - mw-cmp-body: `01 06 7f`
        - mw-cmp-pointers: `20 00 10 00 21 02 20 01 10 00 21 03`
        - mw-cmp-lengths: `20 02 28 02 00 21 04 20 03 28 02 00 21 05`
        - mw-cmp-shorter: `20 04 20 05 49 04 40 41 7f 0f 0b`
        - mw-cmp-longer: `20 04 20 05 4b 04 40 41 01 0f 0b`
        - mw-cmp-exit: `02 40`
          - mw-cmp-loop: `03 40`
            - mw-cmp-bound: `20 04 45 0d 01`
            - mw-cmp-words: `20 02 20 04 41 02 74 6a 28 02 00 21 06 20 03 20 04 41 02 74 6a 28 02 00 21 07`
            - mw-cmp-lower: `20 06 20 07 49 04 40 41 7f 0f 0b`
            - mw-cmp-higher: `20 06 20 07 4b 04 40 41 01 0f 0b`
            - mw-cmp-next: `20 04 41 01 6b 21 04 0c 00 0b`
          - mw-cmp-end: `0b`
        - mw-cmp-equal: `41 00 0b`
    - mw-sub-record: `{{size:mw-sub-body}}`
      - mw-sub-body: `02 05 7f 02 7e`
        - mw-sub-order: `20 00 20 01 10 07 41 00 48 04 40 00 0b`
        - mw-sub-pointers: `20 00 10 00 21 02 20 01 10 00 21 03`
        - mw-sub-lengths: `20 02 28 02 00 21 04 20 03 28 02 00 21 05`
        - mw-sub-exit: `02 40`
          - mw-sub-loop: `03 40`
            - mw-sub-bound: `20 06 20 04 4f 0d 01`
            - mw-sub-a: `20 02 20 06 41 02 74 6a 28 02 04 ad`
            - mw-sub-b: `20 06 20 05 49 04 7e 20 03 20 06 41 02 74 6a 28 02 04 ad 05 42 00 0b`
            - mw-sub-difference: `7d 20 07 7d 21 08`
            - mw-sub-store: `20 02 20 06 41 02 74 6a 20 08 a7 36 02 04`
            - mw-sub-borrow: `20 08 42 3f 88 21 07`
            - mw-sub-next: `20 06 41 01 6a 21 06 0c 00 0b`
          - mw-sub-end: `0b`
        - mw-sub-trim: `20 02 10 01 0b`
    - mw-bits-record: `{{size:mw-bits-body}}`
      - mw-bits-body: `01 02 7f`
        - mw-bits-pointer: `20 00 10 00 21 01 20 01 28 02 00 21 02`
        - mw-bits-zero: `20 02 45 04 40 41 00 0f 0b`
        - mw-bits-count: `20 02 41 05 74 20 01 20 02 41 02 74 6a 28 02 00 67 6b 0b`
    - mw-divrem-record: `{{size:mw-divrem-body}}`
      - mw-divrem-body: `02 02 7f 02 7e`
        - mw-divrem-nonzero: `20 01 45 04 40 00 0b`
        - mw-divrem-pointer: `20 00 10 00 21 02 20 02 28 02 00 21 03`
        - mw-divrem-exit: `02 40`
          - mw-divrem-loop: `03 40`
            - mw-divrem-bound: `20 03 45 0d 01`
            - mw-divrem-combine: `20 04 42 20 86 20 02 20 03 41 02 74 6a 28 02 00 ad 84 21 05`
            - mw-divrem-quotient: `20 02 20 03 41 02 74 6a 20 05 20 01 ad 80 a7 36 02 00`
            - mw-divrem-remainder: `20 05 20 01 ad 82 21 04`
            - mw-divrem-next: `20 03 41 01 6b 21 03 0c 00 0b`
          - mw-divrem-end: `0b`
        - mw-divrem-result: `20 02 10 01 20 04 a7 0b`
    - mw-add-record: `{{size:mw-add-body}}`
      - mw-add-body: `02 06 7f 02 7e`
        - mw-add-pointers: `20 00 10 00 21 02 20 01 10 00 21 03`
        - mw-add-lengths: `20 02 28 02 00 21 04 20 03 28 02 00 21 05`
        - mw-add-maximum: `20 04 20 05 20 04 20 05 4b 1b 21 06`
        - mw-add-exit: `02 40`
          - mw-add-loop: `03 40`
            - mw-add-bound: `20 07 20 06 4f 0d 01`
            - mw-add-a: `20 07 20 04 49 04 7e 20 02 20 07 41 02 74 6a 28 02 04 ad 05 42 00 0b`
            - mw-add-b: `20 07 20 05 49 04 7e 20 03 20 07 41 02 74 6a 28 02 04 ad 05 42 00 0b`
            - mw-add-sum: `7c 20 08 7c 21 09`
            - mw-add-store: `20 02 20 07 41 02 74 6a 20 09 a7 36 02 04`
            - mw-add-carry: `20 09 42 20 88 21 08`
            - mw-add-next: `20 07 41 01 6a 21 07 0c 00 0b`
          - mw-add-end: `0b`
        - mw-add-length: `20 02 20 06 36 02 00`
        - mw-add-extra: `20 08 42 00 52 04 40`
          - mw-add-capacity: `20 06 41 8002 4f 04 40 00 0b`
          - mw-add-extra-word: `20 02 20 06 41 02 74 6a 20 08 a7 36 02 04`
          - mw-add-extra-length: `20 02 20 06 41 01 6a 36 02 00 0b 0b`

`muladd` locals: slot/multiplier/addend 0..2, pointer 3, length 4, index 5,
u64 carry 6 and product 7. `sub` locals: a/b 0..1, pointers 2/3, lengths 4/5,
index 6, u64 borrow 7 and difference 8. The public operation parameters are
all i32; u64 values never cross into the host while arithmetic is running.
`divrem` locals: slot/divisor 0/1, pointer 2, descending limb index 3,
u64 remainder 4 and combined dividend 5.
`add` traverses low limbs first, treating missing high limbs as zero. Locals
are a/b 0/1, pointers 2/3, original lengths 4/5, maximum length 6, index 7,
u64 carry 8 and sum 9. Each sum is at most 2^33-1. Lengths are saved before
writing so that `add(a, a)` also works without copying or an aliasing branch.
