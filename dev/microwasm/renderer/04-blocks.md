# Block structure and line state

[Inline constructs](03-inline.md) · [Next: tables](06-tables.md)

The block parser scans the input once, keeping only byte offsets and small
state values. It joins paragraph lines with spaces. Fences preserve line
breaks and bypass inline parsing; a Mermaid fence is displayed as source.
CRLF input is normalized to LF in fences. An opening fence has at least three
backticks; a closing fence needs at least that many, followed only by spaces
or tabs. Shorter runs remain code. No token tree is retained.

## Pattern: closing nested lists

Every open list has one open item. Moving from depth 3 to depth 1 closes two
items and their lists; the caller then closes the previous depth-1 item before
opening its sibling. That invariant avoids a stack of per-level flags.

```text
close_lists(target):
    while list_depth > target:
        literal(27)  // </li>\n
        literal(15)  // </ul>\n
        list_depth -= 1
```

`[microwasm]`

- close-record: `{{size:close-body}}`
  - close-body: `00`
    - close-exit: `02 40`
      - close-loop: `03 40`
        - close-bound: `23 01 20 00 4d 0d 01`
        - close-tags: `41 1b 10 02 41 0f 10 02`
        - close-depth: `23 01 41 01 6b 24 01 0c 00 0b`
      - close-done: `0b 0b`

## Function 7: run

Locals: length 0, pos 1, end 2, start 3, fence-prefix 4, indent 5, target depth 6,
heading level 7, paragraph-open 8, open-fence length 9, next-line 10.

```text
for each line [pos, end):
    next_line = position after LF, or length + 1 at EOF
    strip trailing CR from the span
    if fence_open:
        if line is a long enough closing fence: close fence
        else: escaped(pos, end); emit('\n')
    else if empty line: close paragraph
    else if line starts with ``` : close other blocks; open fence
    else if line starts with '|' and table probe succeeds:
        close other blocks; render table; resume at returned position
    else if 1..6 hashes followed by space:
        close other blocks; emit heading with inline contents
    else if indentation followed by '- ':
        close paragraph; require even indentation
        adjust list depth, rejecting skipped levels; emit inline item
    else if list_depth > 0 and indent >= 2 * list_depth:
        emit(' '); emit inline continuation of the current item
    else:
        close lists; open or continue paragraph; emit inline span
close paragraph, lists and any unterminated fence
return output length
```

```mermaid
flowchart TD
    A{pos below length?} -- no --> Z[Close remaining paragraph, lists and fence; return output length]
    A -- yes --> R[Find line end; save next-line; exclude trailing CR]
    R --> T[Count leading backticks; discard count below three]
    T --> F{Open fence length nonzero?}
    F -- yes --> FC[Fence close-or-source subflow]
    F -- no --> B{Line span empty?}
    B -- yes --> BC[Close paragraph only; retain list depth]
    B -- no --> O{Backtick prefix nonzero?}
    O -- yes --> OC[Close paragraph and lists; open fence]
    O -- no --> Q{Starts with pipe and table probe succeeds?}
    Q -- yes --> QR[Close paragraph and lists; render table]
    QR --> QA[Assign pos from table result, not next-line]
    Q -- no --> H{One to six hashes followed by a space?}
    H -- yes --> HC[Close paragraph and lists; emit heading]
    H -- no --> I[Rescan indentation from original pos]
    I --> L{Dash-space after indentation?}
    L -- yes --> LC[List-depth subflow; emit item or trap]
    L -- no --> C{Open list and indent at least twice its depth?}
    C -- yes --> CC[Append space and inline continuation to current item]
    C -- no --> P[Close lists; open paragraph or append space; emit inline line]
    FC --> N[Assign pos = next-line]
    BC --> N
    OC --> N
    HC --> N
    LC --> N
    CC --> N
    P --> N
    N --> A
    QA --> A
```

The decision order matters. A heading-looking line inside a fence is source;
a failed table probe leaves the pipe line available to paragraph handling.
Only an empty span is a blank line here: a line containing spaces is not
silently treated as empty. Fences and headings must begin at the line start.
The indentation scan happens later, after those checks.

### Fence subflow: examine a candidate without consuming the line

`run-fence-count-loop` counts backticks at the original line start. When a
fence is already open, that count alone does not close it:

```mermaid
flowchart TD
    A{Prefix at least open-fence length?} -- no --> S[Escape entire line and emit LF]
    A -- yes --> P[Set start after backtick prefix]
    P --> B{start below end?}
    B -- no --> C[Emit fence close; clear open-fence length]
    B -- yes --> W{Byte is space or tab?}
    W -- yes --> I[Increment start]
    I --> B
    W -- no --> S
    S --> N[Advance pos to saved next-line]
    C --> N
```

`start` is a speculative cursor; `pos` still points to the beginning. A
candidate such as four backticks followed by `x` is therefore escaped in
full, including its backticks. There is no rewind or temporary text buffer.
An empty line inside a fence emits LF instead of closing a paragraph.

### List subflow: descent, sibling and ascent are different operations

The `run-list-*` labels handle a recognized dash-space marker. They do not
silently repair odd indentation or a jump over a missing parent.

```mermaid
flowchart TD
    A[Close paragraph if open] --> E{Indent even?}
    E -- no --> X[Trap]
    E -- yes --> T[Target = indent / 2 + 1]
    T --> D{Target greater than list depth?}
    D -- yes --> O{Target exactly depth + 1?}
    O -- no --> X
    O -- yes --> N[Open ul and li; assign new depth]
    D -- no --> U[close_lists target: close deeper items and lists]
    U --> S[Close previous item at target; open sibling item]
    N --> C[Render contents after dash-space]
    S --> C
    C --> R[Advance to next line]
```

The parent item stays open while a child list is opened. On ascent,
`close_lists` closes each deeper item and list, but leaves the target-level
item open; `run-list-sibling` closes that item itself. Closing it in both
places would create an extra closing tag.

| Input line | Depth before | Action | Depth after |
| --- | --- | --- | --- |
| `- root` | 0 | Open first list and item | 1 |
| `  - child` | 1 | Open child list inside root item | 2 |
| `    continuation` | 2 | Append to child; no new item | 2 |
| `  - sibling` | 2 | Close child item; open sibling | 2 |
| `- last` | 2 | Close nested item/list, then root item; open sibling | 1 |
| `prose` | 1 | Close final item/list; open paragraph | 0 |

At depth 1, `    - skipped` requests depth 3 and traps. In contrast,
`    continuation` has no dash-space marker and simply continues the current
item. The depth validation belongs to the marker branch, not all indented text.

### Cursor ownership and termination

| State | Owner and lifetime |
| --- | --- |
| `pos` (local 1) | Outer loop's first unconsumed byte; changed only on a completed block/line path |
| `end` (local 2) | Current line's exclusive content bound, with trailing CR removed |
| `start` (local 3) | Reused scan cursor for fences, hashes and indentation; reset before indentation |
| `next-line` (local 10) | Saved before trimming CR; points past LF, or to length + 1 at EOF |
| `paragraph-open` (local 8) | Tracks whether a paragraph close is still owed |
| `open-fence length` (local 9) | Zero outside a fence; otherwise the minimum closing run |
| `list depth` (global 1) | Number of open lists; each has an open item |

`run-table-probe` uses the non-emitting mode of function 9. On success its
emitting call can consume several lines, so `run-table-render` assigns the
returned cursor directly to `pos`. Using the saved `next-line` there would
render part of the table twice. All other successful paths use `next-line`.
Thus every repeat consumes at least one line; no fallback retries a line.

At EOF, `run-final-*` emits any outstanding closing tags. It also closes an
unterminated fence, without inventing another source line. At the
`run-fence-close-valid` branch, depth 3 targets the outer line loop: the
inner labels are the valid-close `if`, length-test `if`, and in-fence `if`.
This is a loop continuation, not a return from `run`.

Closing a paragraph appears at several transitions: test local 8, emit
literal 4, then clear local 8. It stays inline because the state is local and
the sequence is short; moving it into a helper would require another global
or an extra argument/result convention. The larger repeated scans use the
[shared helpers](02-scanning.md) instead.

`[microwasm]`

- run-record: `{{size:run-body}}`
  - run-body: `01 0a 7f`
    - run-bound: `20 00 41 808010 4b 04 40 00 0b`
    - run-reset: `41 808010 24 00 41 00 24 01`
    - run-exit: `02 40`
      - run-loop: `03 40`
        - run-finished: `20 01 20 00 4f 0d 01`
        - run-line: `20 01 20 00 41 0a 10 03 22 02 41 01 6a 21 0a 20 01 21 03`
        - run-cr-room: `20 02 20 01 4b 04 40`
          - run-cr: `20 02 41 01 6b 2d 00 00 41 0d 46 04 40 20 02 41 01 6b 21 02 0b 0b`
        - run-reset-fence-prefix: `41 00 21 04`
        - run-fence-count-exit: `02 40`
          - run-fence-count-loop: `03 40`
            - run-fence-count-bound: `20 03 20 04 6a 20 02 4f 0d 01`
            - run-fence-count-byte: `20 03 20 04 6a 2d 00 00 41 e000 47 0d 01`
            - run-fence-count-next: `20 04 41 01 6a 21 04 0c 00 0b`
          - run-fence-count-end: `0b`
        - run-fence-count-short: `20 04 41 03 49 04 40 41 00 21 04 0b`
        - run-in-fence: `20 09 04 40`
          - run-fence-close-test: `20 04 20 09 4f 04 40`
            - run-fence-close-position: `20 01 20 04 6a 21 03`
            - run-fence-close-exit: `02 40`
              - run-fence-close-loop: `03 40`
                - run-fence-close-bound: `20 03 20 02 4f 0d 01`
                - run-fence-close-space: `20 03 2d 00 00 41 20 46 20 03 2d 00 00 41 09 46 72 45 0d 01`
                - run-fence-close-next: `20 03 41 01 6a 21 03 0c 00 0b`
              - run-fence-close-end: `0b`
            - run-fence-close-valid: `20 03 20 02 46 04 40 41 2e 10 02 41 00 21 09 20 0a 21 01 0c 03 0b 0b`
          - run-fence-source: `20 01 20 02 10 04 41 0a 10 00`
          - run-fence-next: `20 0a 21 01 0c 01 0b`
        - run-blank: `20 03 20 02 46 04 40`
          - run-blank-close-p: `20 08 04 40 41 04 10 02 41 00 21 08 0b`
          - run-blank-next: `20 0a 21 01 0c 01 0b`
        - run-open-fence: `20 04 04 40`
          - run-open-close-p: `20 08 04 40 41 04 10 02 41 00 21 08 0b`
          - run-open-pre: `41 00 10 06 41 22 10 02 20 04 21 09`
          - run-open-next: `20 0a 21 01 0c 01 0b`
        - run-table-test: `20 01 2d 00 00 41 fc00 46 04 40`
          - run-table-probe: `20 01 20 00 41 00 10 09 04 40`
            - run-table-close-p: `20 08 04 40 41 04 10 02 41 00 21 08 0b`
            - run-table-close-lists: `41 00 10 06`
            - run-table-render: `20 01 20 00 41 01 10 09 21 01 0c 02 0b 0b`
        - run-heading-reset: `41 00 21 07`
        - run-hash-exit: `02 40`
          - run-hash-loop: `03 40`
            - run-hash-bound: `20 03 20 02 4f 20 07 41 06 4f 72 0d 01`
            - run-hash-byte: `20 03 2d 00 00 41 23 47 0d 01`
            - run-hash-next: `20 03 41 01 6a 21 03 20 07 41 01 6a 21 07 0c 00 0b`
          - run-hash-done: `0b`
        - run-heading: `20 07 04 40`
          - run-heading-room: `20 03 20 02 49 04 40`
            - run-heading-space: `20 03 2d 00 00 41 20 46 04 40`
              - run-heading-close-p: `20 08 04 40 41 04 10 02 41 00 21 08 0b`
              - run-heading-close-lists: `41 00 10 06`
              - run-heading-open-tag: `41 3c 10 00 41 e800 10 00 20 07 41 30 6a 10 00 41 3e 10 00`
              - run-heading-text: `20 03 41 01 6a 20 02 10 05`
              - run-heading-close-tag: `41 3c 10 00 41 2f 10 00 41 e800 10 00 20 07 41 30 6a 10 00 41 3e 10 00 41 0a 10 00`
              - run-heading-next: `20 0a 21 01 0c 03 0b`
            - run-heading-room-end: `0b`
          - run-heading-end: `0b`
        - run-indent-reset: `20 01 21 03 41 00 21 05`
        - run-indent-exit: `02 40`
          - run-indent-loop: `03 40`
            - run-indent-bound: `20 03 20 02 4f 0d 01`
            - run-indent-byte: `20 03 2d 00 00 41 20 47 0d 01`
            - run-indent-next: `20 03 41 01 6a 21 03 20 05 41 01 6a 21 05 0c 00 0b`
          - run-indent-done: `0b`
        - run-list-room: `20 03 41 01 6a 20 02 49 04 40`
          - run-list-marker: `20 03 2d 00 00 41 2d 46 20 03 2d 00 01 41 20 46 71 04 40`
            - run-list-close-p: `20 08 04 40 41 04 10 02 41 00 21 08 0b`
            - run-list-indent-check: `20 05 41 01 71 04 40 00 0b`
            - run-list-target: `20 05 41 01 76 41 01 6a 21 06`
            - run-list-deeper: `20 06 23 01 4b 04 40`
              - run-list-depth-check: `20 06 23 01 41 01 6a 47 04 40 00 0b`
              - run-list-open: `41 0a 10 02 41 16 10 02 20 06 24 01`
              - run-list-sibling: `05 20 06 10 06 41 1b 10 02 41 16 10 02 0b`
            - run-list-text: `20 03 41 02 6a 20 02 10 05`
            - run-list-next: `20 0a 21 01 0c 02 0b`
          - run-list-room-end: `0b`
        - run-item-continuation: `23 01 04 40`
          - run-item-indent: `20 05 23 01 41 01 74 4f 04 40`
            - run-item-text: `41 20 10 00 20 03 20 02 10 05`
            - run-item-next: `20 0a 21 01 0c 02 0b 0b`
        - run-prose-close-lists: `41 00 10 06`
        - run-paragraph: `20 08 04 40 41 20 10 00 05 41 00 10 02 41 01 21 08 0b`
        - run-prose: `20 01 20 02 10 05`
        - run-next: `20 0a 21 01 0c 00 0b`
      - run-done: `0b`
    - run-final-p: `20 08 04 40 41 04 10 02 0b`
    - run-final-lists: `41 00 10 06`
    - run-final-fence: `20 09 04 40 41 2e 10 02 0b`
    - run-result: `23 00 41 808010 6b 0b`
