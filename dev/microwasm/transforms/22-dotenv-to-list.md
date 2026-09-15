# Dotenv assignments to a Markdown data list

Tool 22 reads a `dotenv` fenced block into a flat object of strings.
It does not set environment variables, load files or expand references.

```dotenv
export NAME=Ben
PORT=3030
GREETING="Hello # friend"
LINES="first\nsecond"
LITERAL='${NAME}'
EMPTY=
```

becomes:

```text
- "NAME" "Ben"
- "PORT" "3030"
- "GREETING" "Hello # friend"
- "LINES" "first\nsecond"
- "LITERAL" "${NAME}"
- "EMPTY" ""
```

## Dialect and strict error handling

The value conventions follow the common
[dotenv parser](https://github.com/motdotla/dotenv#what-rules-does-the-parsing-engine-follow).
Names are nonempty ASCII letters, digits, underscores, dots or hyphens, and
are case-sensitive. An optional `export` followed by spaces/tabs precedes a
name. `export=value` is an ordinary assignment. The delimiter is `=`, or `:`
followed by a space/tab. Outer spaces/tabs are ignored for unquoted values.
An unquoted `#` begins a comment; semicolons are ordinary value characters.

Single, double and backtick quotes preserve internal whitespace and `#`.
All three support physical multiline values. In double quotes only, `\n`
and `\r` become newline and carriage return; other backslashes remain literal.
A backslash immediately before the matching quote keeps that quote inside
the value, **retaining the backslash too**. There is no shell evaluation,
interpolation or general JSON-style escape decoding. CRLF and bare CR in
the body normalize to LF, as in the common parser; escaped `\r` does not.

Unlike that parser's permissive mode, malformed assignments, unterminated
quotes, text after a closing quote and duplicate names are errors. A quote
immediately preceded by a backslash is never guessed to be a closing quote.
Use a different quote delimiter for a value ending in a backslash. There is
no concatenation of quoted and unquoted pieces. Raw C0 controls except tab,
LF and CR, DEL and malformed UTF-8 are rejected, including in comments.
Whitespace here means ASCII space/tab, not arbitrary Unicode whitespace.

The fence is at least three backticks plus `dotenv`, followed by LF or CRLF,
with a closing fence of at least the same length on a separate line and no
surrounding prose. Longer fences can surround literal backtick lines in values.
An earlier closing-fence line is an error, not silently treated as value text.
An empty body produces an empty list, with no wrapper item. Source order is
retained; numeric-looking and
Boolean-looking values remain strings. JSON quoting keeps multiline values
on one physical Markdown list line.

## Pattern: validate bytes once, then parse bounded spans

```text
bound and validate the fenced UTF-8 body
skip blank lines and comments
for each assignment:
  read a name, optionally following 'export'; require a delimiter
  emit its JSON-quoted key, rejecting an earlier identical key
  quoted value: scan to its unescaped matching quote across lines
  unquoted value: scan to comment or line end, trimming spaces/tabs
  emit the value as one JSON-quoted string
  require line end, with optional trailing whitespace/comment
```

The existing Wasm Unicode iterator validates the body without interpreting
ASCII backslashes. The quote-byte helper handles JSON escaping. There is no
intermediate tree, regular expression or host conversion callback. Duplicate
checks rescan earlier output keys, using constant space and quadratic time
for wide objects. Input occupies the first 64 KiB and output the next 128 KiB;
ten fixed fence bytes occupy the last page. Stores are bounded. Input and
scratch remain unchanged after instantiation. A trap must not publish partial
output, and another call resets the instance for recovery.

## Inside value: consume escaped quotes before the next loop iteration

The quoted branch retains the opening delimiter. Each iteration loads a
byte and advances the source cursor immediately. If that byte is backslash
and the following byte is the matching delimiter, `dl-quoted-escaped-quote`
emits both as data, advances past the delimiter, and repeats the loop.
That delimiter can therefore never reach `dl-quoted-close` on the next turn.
This is not JSON escape handling: the backslash remains part of the value.

Only double quotes activate the n/r escape branch. Physical CR optionally
consumes a following LF, then becomes one LF; an escaped r becomes CR and
does not go through that physical-line normalization. Other bytes go to the
JSON quote-byte emitter unchanged in meaning.

The unquoted branch instead retains two ends: the source cursor stops at
the comment or line separator, while a local end moves backward to trim
spaces/tabs. Copying uses the trimmed end, but the outer assignment loop
resumes at the original separator. Trimming cannot accidentally turn comment
text into part of the value or skip the next assignment.

## Module

Imports: equal 0, next-unit 1 and memory from `k`. Definitions: run 2, emit 3,
quote-byte 4, spaces 5, name-byte 6, name 7, value 8, comment 9, unique 10,
validate 11, newline 12, whitespace 13, export-word 14, contained-fence 15.
Globals: output 0, cursor 1, body end 2, opening fence length 3.

`[microwasm]`

- dl-header: `0061736d 01000000`
- dl-type-section: `01 {{size:dl-types}}`
  - dl-types: `09 60 04 7f 7f 7f 7f 01 7f 60 03 7f 7f 7f 03 7f 7f 7f 60 01 7f 01 7f 60 01 7f 00 60 00 00 60 00 02 7f 7f 60 03 7f 7f 7f 00 60 02 7f 7f 00 60 02 7f 7f 01 7f`
- dl-import-section: `02 {{size:dl-imports}}`
  - dl-imports: `03 01 6b 05 657175616c 00 00 01 6b 04 6e657874 00 01 01 6b 06 6d656d6f7279 02 01 04 04`
- dl-function-section: `03 {{size:dl-functions}}`
  - dl-functions: `0e 02 03 03 04 02 05 04 04 06 07 04 02 08 07`
- dl-global-section: `06 {{size:dl-globals}}`
  - dl-globals: `04 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b`
- dl-export-section: `07 {{size:dl-exports}}`
  - dl-exports: `02 03 72756e 00 02 06 6d656d6f7279 02 00`
- dl-code-section: `0a {{size:dl-code}}`
  - dl-code: `0e`
    - dl-run-record: `{{size:dl-run-body}}`
      - dl-run-body: `01 07 7f`
        - dl-run-bound: `20 00 41 0d 49 20 00 41 808004 4b 72 04 40 00 0b`
        - dl-run-fence-count: `41 00 24 03 02 40 03 40 23 03 20 00 4f 0d 01 23 03 2d 00 00 41 e000 47 0d 01 23 03 41 01 6a 24 03 0c 00 0b 0b`
        - dl-run-fence-bound: `23 03 41 03 49 23 03 41 07 6a 20 00 4b 72 04 40 00 0b`
        - dl-run-prefix: `03 40 23 03 20 02 6a 2d 00 00 20 02 41 84820c 6a 2d 00 00 47 04 40 00 0b 20 02 41 01 6a 22 02 41 06 49 0d 00 0b`
        - dl-run-opening: `23 03 41 06 6a 24 01 23 01 2d 00 00 41 0d 46 04 40 23 01 41 01 6a 24 01 0b 23 01 2d 00 00 41 0a 47 04 40 00 0b 23 01 41 01 6a 24 01 20 00 21 01`
        - dl-run-trim: `02 40 03 40 20 01 45 0d 01 20 01 41 01 6b 2d 00 00 10 0d 45 0d 01 20 01 41 01 6b 21 01 0c 00 0b 0b`
        - dl-run-closing-count: `41 00 21 02 02 40 03 40 20 01 45 0d 01 20 01 41 01 6b 2d 00 00 41 e000 47 0d 01 20 01 41 01 6b 21 01 20 02 41 01 6a 21 02 0c 00 0b 0b`
        - dl-run-closing-bound: `20 02 23 03 49 20 01 23 01 49 72 04 40 00 0b 20 01 24 02`
        - dl-run-closing-line: `23 02 23 01 47 04 40 23 02 41 01 6b 2d 00 00 22 02 41 0a 47 20 02 41 0d 47 71 04 40 00 0b 0b`
        - dl-run-validate: `23 01 23 02 10 0b 23 01 23 02 10 0f`
        - dl-run-output: `41 808004 24 00`
        - dl-run-loop: `02 40 03 40`
          - dl-run-spaces: `10 05 23 01 23 02 4f 0d 01`
          - dl-run-blank: `23 01 2d 00 00 22 02 41 0a 46 20 02 41 0d 46 72 04 40 10 0c 0c 01 0b`
          - dl-run-comment: `20 02 41 23 46 04 40 10 09 0c 01 0b`
          - dl-run-key: `10 07 21 04 21 03`
          - dl-run-export: `20 03 20 04 10 0e 23 01 2d 00 00 22 02 41 20 46 20 02 41 09 46 72 71 04 40 10 05 10 07 21 04 21 03 0b`
          - dl-run-separator: `10 05 23 01 2d 00 00 21 02 20 02 41 3d 47 04 40 20 02 41 3a 47 04 40 00 0b 23 01 41 01 6a 2d 00 00 22 02 41 20 47 20 02 41 09 47 71 04 40 00 0b 0b 23 01 41 01 6a 24 01 10 05`
          - dl-run-key-prefix: `23 00 21 05 41 2d 10 03 41 20 10 03 23 00 21 06 41 22 10 03 20 03 21 02`
          - dl-run-key-copy: `03 40 20 02 2d 00 00 10 03 20 02 41 01 6a 22 02 20 04 49 0d 00 0b 41 22 10 03 23 00 21 07`
          - dl-run-unique: `20 05 20 06 20 07 10 0a 41 20 10 03 10 08`
          - dl-run-tail: `10 05 23 01 23 02 49 04 40 23 01 2d 00 00 41 23 46 04 40 10 09 0b 0b 23 01 23 02 49 04 40 10 0c 0b 41 0a 10 03 0c 00 0b 0b`
        - dl-run-result: `23 00 41 808004 6b 0b`
    - dl-emit-record: `{{size:dl-emit-body}}`
      - dl-emit-body: `00 23 00 41 80800c 4f 04 40 00 0b 23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - dl-byte-record: `{{size:dl-byte-body}}`
      - dl-byte-body: `00`
        - dl-byte-tab: `20 00 41 09 46 04 40 41 dc00 10 03 41 f400 10 03 0f 0b`
        - dl-byte-lf: `20 00 41 0a 46 04 40 41 dc00 10 03 41 ee00 10 03 0f 0b`
        - dl-byte-cr: `20 00 41 0d 46 04 40 41 dc00 10 03 41 f200 10 03 0f 0b`
        - dl-byte-escape: `20 00 41 22 46 20 00 41 dc00 46 72 04 40 41 dc00 10 03 0b 20 00 10 03 0b`
    - dl-spaces-record: `{{size:dl-spaces-body}}`
      - dl-spaces-body: `00 02 40 03 40 23 01 23 02 4f 0d 01 23 01 2d 00 00 41 20 46 23 01 2d 00 00 41 09 46 72 45 0d 01 23 01 41 01 6a 24 01 0c 00 0b 0b 0b`
    - dl-name-byte-record: `{{size:dl-name-byte-body}}`
      - dl-name-byte-body: `00 20 00 41 c100 6b 41 19 4d 20 00 41 e100 6b 41 19 4d 72 20 00 41 30 6b 41 09 4d 72 20 00 41 df00 46 72 20 00 41 2e 46 72 20 00 41 2d 46 72 0b`
    - dl-name-record: `{{size:dl-name-body}}`
      - dl-name-body: `01 01 7f 23 01 21 00 02 40 03 40 23 01 23 02 4f 0d 01 23 01 2d 00 00 10 06 45 0d 01 23 01 41 01 6a 24 01 0c 00 0b 0b 20 00 23 01 46 04 40 00 0b 20 00 23 01 0b`
    - dl-value-record: `{{size:dl-value-body}}`
      - dl-value-body: `01 04 7f`
        - dl-value-open: `41 22 10 03 23 01 2d 00 00 21 00`
        - dl-value-quoted: `20 00 41 22 46 20 00 41 27 46 72 20 00 41 e000 46 72 04 40 23 01 41 01 6a 24 01`
          - dl-quoted-loop: `03 40 23 01 23 02 4f 04 40 00 0b 23 01 2d 00 00 21 01 23 01 41 01 6a 24 01`
            - dl-quoted-close: `20 01 20 00 46 04 40 41 22 10 03 0f 0b`
            - dl-quoted-cr: `20 01 41 0d 46 04 40 23 01 23 02 49 04 40 23 01 2d 00 00 41 0a 46 04 40 23 01 41 01 6a 24 01 0b 0b 41 0a 21 01 0b`
            - dl-quoted-slash: `20 01 41 dc00 46 23 01 23 02 49 71 04 40`
              - dl-quoted-escaped-quote: `23 01 2d 00 00 22 02 20 00 46 04 40 41 dc00 10 04 20 02 10 04 23 01 41 01 6a 24 01 0c 02 0b`
              - dl-quoted-newline: `20 00 41 22 46 20 02 41 ee00 46 20 02 41 f200 46 72 71 04 40 20 02 41 ee00 46 04 7f 41 0a 05 41 0d 0b 21 01 23 01 41 01 6a 24 01 0b 0b`
            - dl-quoted-copy: `20 01 10 04 0c 00 0b 00`
          - dl-value-unquoted: `05 23 01 21 02`
          - dl-unquoted-scan: `02 40 03 40 23 01 23 02 4f 0d 01 23 01 2d 00 00 22 01 41 0a 46 20 01 41 0d 46 72 20 01 41 23 46 72 0d 01 23 01 41 01 6a 24 01 0c 00 0b 0b 23 01 21 03`
          - dl-unquoted-trim: `02 40 03 40 20 03 20 02 4d 0d 01 20 03 41 01 6b 2d 00 00 22 01 41 20 46 20 01 41 09 46 72 45 0d 01 20 03 41 01 6b 21 03 0c 00 0b 0b`
          - dl-unquoted-copy: `02 40 03 40 20 02 20 03 4f 0d 01 20 02 2d 00 00 10 04 20 02 41 01 6a 21 02 0c 00 0b 0b 41 22 10 03 0b 0b`
    - dl-comment-record: `{{size:dl-comment-body}}`
      - dl-comment-body: `00 02 40 03 40 23 01 23 02 4f 0d 01 23 01 2d 00 00 41 0a 46 23 01 2d 00 00 41 0d 46 72 0d 01 23 01 41 01 6a 24 01 0c 00 0b 0b 0b`
    - dl-unique-record: `{{size:dl-unique-body}}`
      - dl-unique-body: `01 02 7f 41 808004 21 03`
        - dl-unique-exit: `02 40 03 40 20 03 20 00 4f 0d 01 20 03 41 03 6a 21 04`
          - dl-unique-key: `03 40 20 04 2d 00 00 41 22 46 04 40 05 20 04 41 01 6a 21 04 0c 01 0b 0b`
          - dl-unique-compare: `20 03 41 02 6a 20 04 41 01 6a 20 01 20 02 10 00 04 40 00 0b`
          - dl-unique-line: `03 40 20 04 2d 00 00 41 0a 46 04 40 05 20 04 41 01 6a 21 04 0c 01 0b 0b 20 04 41 01 6a 21 03 0c 00 0b 0b 0b`
    - dl-validate-record: `{{size:dl-validate-body}}`
      - dl-validate-body: `01 01 7f 02 40 03 40 20 00 20 01 4f 0d 01 20 00 2d 00 00 21 02`
        - dl-validate-control: `20 02 41 20 49 20 02 41 09 47 71 20 02 41 0a 47 71 20 02 41 0d 47 71 20 02 41 ff00 46 72 04 40 00 0b`
        - dl-validate-unicode: `20 02 41 8001 4f 04 40 20 00 20 01 41 00 10 01 1a 21 00 1a 05 20 00 41 01 6a 21 00 0b 0c 00 0b 0b 0b`
    - dl-newline-record: `{{size:dl-newline-body}}`
      - dl-newline-body: `00 23 01 2d 00 00 41 0d 46 04 40 23 01 41 01 6a 24 01 23 01 23 02 4f 04 40 0f 0b 23 01 2d 00 00 41 0a 47 04 40 0f 0b 05 23 01 2d 00 00 41 0a 47 04 40 00 0b 0b 23 01 41 01 6a 24 01 0b`
    - dl-whitespace-record: `{{size:dl-whitespace-body}}`
      - dl-whitespace-body: `00 20 00 41 20 46 20 00 41 09 46 72 20 00 41 0a 46 72 20 00 41 0d 46 72 0b`
    - dl-export-record: `{{size:dl-export-body}}`
      - dl-export-body: `00 20 01 20 00 6b 41 06 47 04 40 41 00 0f 0b 20 00 2d 00 00 41 e500 46 20 00 2d 00 01 41 f800 46 71 20 00 2d 00 02 41 f000 46 71 20 00 2d 00 03 41 ef00 46 71 20 00 2d 00 04 41 f200 46 71 20 00 2d 00 05 41 f400 46 71 0b`
    - dl-contained-record: `{{size:dl-contained-body}}`
      - dl-contained-body: `01 02 7f 02 40 03 40 20 00 20 01 4f 0d 01 20 00 21 02 41 00 21 03`
        - dl-contained-indent: `02 40 03 40 20 02 20 01 4f 20 03 41 03 4f 72 0d 01 20 02 2d 00 00 41 20 47 0d 01 20 03 41 01 6a 21 03 20 02 41 01 6a 21 02 0c 00 0b 0b 41 00 21 03`
        - dl-contained-ticks: `02 40 03 40 20 02 20 01 4f 0d 01 20 02 2d 00 00 41 e000 47 0d 01 20 03 41 01 6a 21 03 20 02 41 01 6a 21 02 0c 00 0b 0b`
        - dl-contained-candidate: `20 03 23 03 4f 04 40`
          - dl-contained-trailing: `02 40 03 40 20 02 20 01 4f 0d 01 20 02 2d 00 00 41 20 46 20 02 2d 00 00 41 09 46 72 45 0d 01 20 02 41 01 6a 21 02 0c 00 0b 0b`
          - dl-contained-reject: `20 02 20 01 4f 04 40 00 0b 20 02 2d 00 00 41 0a 46 20 02 2d 00 00 41 0d 46 72 04 40 00 0b 0b`
        - dl-contained-line: `02 40 03 40 20 00 20 01 4f 0d 01 20 00 2d 00 00 41 0a 46 20 00 2d 00 00 41 0d 46 72 0d 01 20 00 41 01 6a 21 00 0c 00 0b 0b`
        - dl-contained-next: `20 00 41 01 6a 21 00 0c 00 0b 0b 0b`
- dl-data-section: `0b {{size:dl-data}}`
  - dl-data: `01 00 41 80820c 0b {{size:dl-literals}}`
    - dl-literals: `09 606060646f74656e76`

Run locals: length 0, trimmed input end 1, byte/index 2, key span 3/4,
output line start 5, output key span 6/7. Value locals: delimiter 0, byte 1,
lookahead/source start 2, trimmed end 3. Unique locals: output line start 0,
new key span 1/2, previous line 3, scan cursor 4.
