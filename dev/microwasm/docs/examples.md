# Twenty examples

All twenty examples are implemented. Each has its own
pseudocode, flowchart, annotated nested byte lists with placeholders, resolved
Markdown, hex output, and execution tests. Build artifacts belong in `dist/`.

1. Factorial: locals, a loop, multiplication, and an explicit input bound.
2. Fibonacci: rotating state and integer addition.
3. Greatest common divisor: remainder and a shrinking loop.
4. Integer power: exponentiation by squaring and bit tests.
5. Prime test: early exits and bounded trial division.
6. Population count: clear one set bit per iteration.
7. Sum an integer array: memory loads and accumulation.
8. Find a minimum and its index: memory traversal and tie behavior.
9. Binary search: intervals, offsets, and a not-found result.
10. Insertion sort: nested loops and in-place memory writes.
11. ASCII uppercase filter: conditional byte replacement; preserve non-ASCII.
12. ROT13 filter: separate upper/lowercase ranges.
13. Count lines: distinguish terminated and unterminated final lines.
14. UTF-8 validation: continuation bytes and invalid encodings.
15. Balanced brackets: a stack in linear memory.
16. Run-length encoding: grouping adjacent bytes.
17. Run-length decoding: expanding groups with output bounds.
18. JSON string escaping: quotes, backslashes, and control characters.
19. CSV to JSON: quoted fields, escaped quotes, records, and JSON escaping.
20. Conway's Game of Life: two-dimensional indexing and simultaneous updates.

Filters must do their transformation in Wasm, not by handing the input to a
JavaScript implementation. Host code may put bytes in memory, call an export,
read bytes back, and compare with independently computed expected results.
Game of Life needs actual evolving grids, including known oscillators; merely
rendering a stored grid does not count.

Tests should include empty/boundary inputs and failures where applicable, not
just one happy-path value. Limits and numeric behavior belong in the documents.
Run `deno task build` for the resolved documents and binaries, and
`deno task test` for the complete document-to-execution checks. The browser
index links the same examples, reading their generated hex instead of a
separately maintained implementation.
