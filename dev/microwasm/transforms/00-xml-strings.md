# XML characters, names and decoded strings

This is a shared executable pattern for the XML reader and writer, not an
additional tool in the fifty-tool count. It implements XML 1.0 Fifth Edition
[characters and names](https://www.w3.org/TR/xml/#sec-common-syn), the five
predefined entities and decimal/hexadecimal character references.
There is no DTD, entity declaration, external resource or namespace resolver.
Names are lexical XML names, including Unicode and colons; namespace binding
checks belong to a namespace-aware consumer, not this helper.

## Interfaces

- `character(scalar) -> boolean`: whether an integer is an XML character.
- `nameStart(scalar) -> boolean`, `namePart(scalar) -> boolean`: the XML name
  productions, including their exact Unicode intervals, not locale classes.
- `scalar(start, end) -> (scalar, next)`: decode one raw UTF-8 XML character.
  Backslashes remain ordinary characters. Malformed UTF-8 and forbidden XML
  characters trap. Spans may use any of the shared memory's four pages.
- `nameEnd(start, end) -> next`: require one name and scan to its first
  non-name character. A digit or combining mark cannot begin a name.
- `entity(start, end) -> (scalar, next)`: require an `&` reference and consume
  it through `;`. Named references are case-sensitive. Hexadecimal references
  use lowercase `x`, with either case for their digits. A numeric reference
  must contain digits and resolve to an allowed XML character.
- `string(start, end, output, mode) -> length`: emit a JSON-quoted string,
  including both quotes. Mode 0 decodes text, 1 decodes an attribute value,
  and 2 handles literal content such as CDATA or comments. The caller removes
  markup/attribute delimiters first. Each resulting string fits on one physical
  Markdown list line; quote, backslash, tab, LF and CR are escaped.

Mode 0 rejects raw `<` and `]]>`; mode 1 rejects raw `<`. Mode 2 does not
expand entities or interpret markup. Its caller still checks the enclosing
construct's syntax, such as forbidden `--` inside a comment.

## Pattern: distinguish raw whitespace from character references

XML normalizes literal CRLF and lone CR to LF. In attribute values, literal
tab, LF and CR become spaces. A numeric character reference to one of those
characters preserves it instead. This helper keeps those two paths separate.
It treats attributes as CDATA-valued, without DTD-dependent token collapsing.
See [attribute normalization](https://www.w3.org/TR/xml/#AVNormalize) and
[end-of-line handling](https://www.w3.org/TR/xml/#sec-line-ends).

```text
for each input character:
  entity-enabled mode and '&': decode one reference, retaining its character
  otherwise:
    decode a raw XML character
    normalize CRLF or CR to LF
    attribute mode: change literal tab/LF to space
  emit the character as JSON string data
```

The raw decoder handles ASCII directly, then uses the existing JSON-string
iterator only for non-ASCII UTF-8. Thus its JSON escape behavior never sees
an XML backslash. The iterator's pending surrogate, when present, reconstructs
one astral scalar immediately. This reuses tested UTF-8 validation without
copying strings or asking a host parser to do the work.

Numeric references accumulate with an upper bound of U+10FFFF after every
digit. Leading zeros are allowed, but overflow cannot wrap around into a
valid scalar. Named references use direct comparisons, not a mutable entity
table. All state is scalar locals except the string output cursor, reset
on every string call. There are no data segments to be overwritten when the
list compiler later reuses scratch memory.

Input spans are bounded by the fixed four-page memory. String output must
start in `0x10000..0x30000` and stores stop before `0x30000`. The caller keeps
input and output disjoint. Input bytes are never changed. Failed output may
be partial and must not be published; the next call resets the output cursor.

## Module

Import the JSON iterator as `k.next` (function 0) and `k.memory`. Definitions:
scalar 1, character 2, name-start 3, name-part 4, name-end 5, entity 6,
string 7, emit 8, JSON-scalar 9, hex-value 10. Global 0 is the output cursor.

`[microwasm]`

- xs-header: `0061736d 01000000`
- xs-type-section: `01 {{size:xs-types}}`
  - xs-types: `06 60 03 7f 7f 7f 03 7f 7f 7f 60 02 7f 7f 02 7f 7f 60 01 7f 01 7f 60 02 7f 7f 01 7f 60 04 7f 7f 7f 7f 01 7f 60 01 7f 00`
- xs-import-section: `02 {{size:xs-imports}}`
  - xs-imports: `02 01 6b 04 6e657874 00 00 01 6b 06 6d656d6f7279 02 01 04 04`
- xs-function-section: `03 {{size:xs-functions}}`
  - xs-functions: `0a 01 02 02 02 03 01 04 05 05 02`
- xs-global-section: `06 {{size:xs-globals}}`
  - xs-globals: `01 7f 01 41 00 0b`
- xs-export-section: `07 {{size:xs-exports}}`
  - xs-exports: `08 06 7363616c6172 00 01 09 636861726163746572 00 02 09 6e616d655374617274 00 03 08 6e616d6550617274 00 04 07 6e616d65456e64 00 05 06 656e74697479 00 06 06 737472696e67 00 07 06 6d656d6f7279 02 00`
- xs-code-section: `0a {{size:xs-code}}`
  - xs-code: `0a`
    - xs-scalar-record: `{{size:xs-scalar-body}}`
      - xs-scalar-body: `01 02 7f`
        - xs-scalar-bound: `20 00 20 01 4f 20 01 41 808010 4b 72 04 40 00 0b`
        - xs-scalar-ascii: `20 00 2d 00 00 22 02 41 8001 49 04 40 20 00 41 01 6a 21 00`
        - xs-scalar-utf8: `05 20 00 20 01 41 00 10 00 21 03 21 00 21 02`
          - xs-scalar-astral: `20 03 04 40 20 02 41 80b003 6b 41 0a 74 20 03 41 80b803 6b 6a 41 808004 6a 21 02 0b 0b`
        - xs-scalar-xml: `20 02 10 02 45 04 40 00 0b 20 02 20 00 0b`
    - xs-character-record: `{{size:xs-character-body}}`
      - xs-character-body: `00 20 00 41 09 46 20 00 41 0a 46 72 20 00 41 0d 46 72 20 00 41 20 6b 41 dfaf03 4d 72 20 00 41 80c003 6b 41 fd3f 4d 72 20 00 41 808004 6b 41 ffff3f 4d 72 0b`
    - xs-name-start-record: `{{size:xs-name-start-body}}`
      - xs-name-start-body: `00`
        - xs-name-start-ascii: `20 00 41 8001 49 04 40 20 00 41 c100 6b 41 19 4d 20 00 41 e100 6b 41 19 4d 72 20 00 41 3a 46 72 20 00 41 df00 46 72 0f 0b`
        - xs-name-start-latin: `20 00 41 c001 6b 41 16 4d 20 00 41 d801 6b 41 1e 4d 72 20 00 41 f801 6b 41 8704 4d 72`
        - xs-name-start-greek: `20 00 41 f006 6b 41 0d 4d 72 20 00 41 ff06 6b 41 8039 4d 72`
        - xs-name-start-middle: `20 00 41 8cc000 6b 41 01 4d 72 20 00 41 f0c000 6b 41 9f02 4d 72 20 00 41 80d800 6b 41 ef07 4d 72 20 00 41 81e000 6b 41 fecf02 4d 72`
        - xs-name-start-high: `20 00 41 80f203 6b 41 cf09 4d 72 20 00 41 f0fb03 6b 41 8d04 4d 72 20 00 41 808004 6b 41 ffff37 4d 72 0b`
    - xs-name-part-record: `{{size:xs-name-part-body}}`
      - xs-name-part-body: `00 20 00 10 03 20 00 41 2d 46 72 20 00 41 2e 46 72 20 00 41 30 6b 41 09 4d 72 20 00 41 b701 46 72 20 00 41 8006 6b 41 ef00 4d 72 20 00 41 bfc000 6b 41 01 4d 72 0b`
    - xs-name-end-record: `{{size:xs-name-end-body}}`
      - xs-name-end-body: `01 01 7f`
        - xs-name-end-first: `20 00 20 01 10 01 21 00 10 03 45 04 40 00 0b`
        - xs-name-end-loop: `02 40 03 40 20 00 20 01 4f 0d 01 20 00 20 01 10 01 21 02 10 04 45 0d 01 20 02 21 00 0c 00 0b 0b 20 00 0b`
    - xs-entity-record: `{{size:xs-entity-body}}`
      - xs-entity-body: `01 06 7f`
        - xs-entity-bound: `20 00 20 01 4f 20 01 41 808010 4b 72 04 40 00 0b 20 00 2d 00 00 41 26 47 04 40 00 0b 20 00 41 01 6a 21 00 20 00 20 01 4f 04 40 00 0b`
        - xs-entity-numeric: `20 00 2d 00 00 41 23 46 04 40 20 00 41 01 6a 21 00 41 0a 21 03`
          - xs-entity-hex-prefix: `20 00 20 01 49 04 40 20 00 2d 00 00 41 f800 46 04 40 41 10 21 03 20 00 41 01 6a 21 00 0b 0b`
          - xs-entity-digits: `03 40 20 00 20 01 4f 04 40 00 0b 20 00 2d 00 00 22 04 41 3b 46 04 40 20 05 45 04 40 00 0b 20 02 10 02 45 04 40 00 0b 20 02 20 00 41 01 6a 0f 0b`
            - xs-entity-digit-value: `20 04 10 0a 22 04 20 03 4f 04 40 00 0b`
            - xs-entity-accumulate: `20 02 20 03 6c 20 04 6a 22 02 41 ffffc300 4b 04 40 00 0b 20 05 41 01 6a 21 05 20 00 41 01 6a 21 00 0c 00 0b 0b`
        - xs-entity-name-start: `20 00 21 06`
        - xs-entity-name-loop: `02 40 03 40 20 00 20 01 4f 04 40 00 0b 20 00 2d 00 00 41 3b 46 0d 01 20 00 20 06 6b 41 04 4f 04 40 00 0b 20 00 41 01 6a 21 00 0c 00 0b 0b 20 00 20 06 6b 21 07`
        - xs-entity-two: `20 07 41 02 46 04 40 20 06 41 01 6a 2d 00 00 41 f400 47 04 40 00 0b 20 06 2d 00 00 41 ec00 46 04 40 41 3c 21 02 05 20 06 2d 00 00 41 e700 47 04 40 00 0b 41 3e 21 02 0b`
        - xs-entity-three: `05 20 07 41 03 46 04 40 20 06 2d 00 00 41 e100 47 20 06 41 01 6a 2d 00 00 41 ed00 47 72 20 06 41 02 6a 2d 00 00 41 f000 47 72 04 40 00 0b 41 26 21 02`
        - xs-entity-four: `05 20 07 41 04 47 04 40 00 0b 20 06 2d 00 00 41 f100 46 04 40`
          - xs-entity-quot: `20 06 41 01 6a 2d 00 00 41 f500 47 20 06 41 02 6a 2d 00 00 41 ef00 47 72 20 06 41 03 6a 2d 00 00 41 f400 47 72 04 40 00 0b 41 22 21 02`
          - xs-entity-apos: `05 20 06 2d 00 00 41 e100 47 20 06 41 01 6a 2d 00 00 41 f000 47 72 20 06 41 02 6a 2d 00 00 41 ef00 47 72 20 06 41 03 6a 2d 00 00 41 f300 47 72 04 40 00 0b 41 27 21 02 0b 0b 0b`
        - xs-entity-result: `20 02 20 00 41 01 6a 0b`
    - xs-string-record: `{{size:xs-string-body}}`
      - xs-string-body: `01 01 7f`
        - xs-string-bound: `20 00 20 01 4b 20 01 41 808010 4b 72 20 02 41 808004 49 72 20 02 41 80800c 4b 72 20 03 41 02 4b 72 04 40 00 0b 20 02 24 00 41 22 10 08`
        - xs-string-loop: `02 40 03 40 20 00 20 01 4f 0d 01`
          - xs-string-entity: `20 03 41 02 49 20 00 2d 00 00 41 26 46 71 04 40 20 00 20 01 10 06 21 00 21 04`
          - xs-string-raw: `05`
            - xs-string-less: `20 03 41 02 49 20 00 2d 00 00 41 3c 46 71 04 40 00 0b`
            - xs-string-cdata-close: `20 03 45 20 00 41 02 6a 20 01 49 71 04 40 20 00 2d 00 00 41 dd00 46 20 00 41 01 6a 2d 00 00 41 dd00 46 71 20 00 41 02 6a 2d 00 00 41 3e 46 71 04 40 00 0b 0b`
            - xs-string-scalar: `20 00 20 01 10 01 21 00 21 04`
            - xs-string-cr: `20 04 41 0d 46 04 40 20 00 20 01 49 04 40 20 00 2d 00 00 41 0a 46 04 40 20 00 41 01 6a 21 00 0b 0b 41 0a 21 04 0b`
            - xs-string-attribute-space: `20 03 41 01 46 20 04 41 09 46 20 04 41 0a 46 72 71 04 40 41 20 21 04 0b 0b`
          - xs-string-output: `20 04 10 09 0c 00 0b 0b 41 22 10 08 23 00 20 02 6b 0b`
    - xs-emit-record: `{{size:xs-emit-body}}`
      - xs-emit-body: `00 23 00 41 80800c 4f 04 40 00 0b 23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - xs-json-scalar-record: `{{size:xs-json-scalar-body}}`
      - xs-json-scalar-body: `01 01 7f`
        - xs-json-short: `20 00 41 09 46 04 40 41 f400 21 01 0b 20 00 41 0a 46 04 40 41 ee00 21 01 0b 20 00 41 0d 46 04 40 41 f200 21 01 0b 20 01 04 40 41 dc00 10 08 20 01 10 08 0f 0b`
        - xs-json-escape: `20 00 41 22 46 20 00 41 dc00 46 72 04 40 41 dc00 10 08 0b`
        - xs-json-ascii: `20 00 41 8001 49 04 40 20 00 10 08 0f 0b`
        - xs-json-two: `20 00 41 8010 49 04 40 20 00 41 06 76 41 c001 72 10 08`
          - xs-json-more: `05 20 00 41 808004 49 04 40 20 00 41 0c 76 41 e001 72 10 08`
            - xs-json-four: `05 20 00 41 12 76 41 f001 72 10 08 20 00 41 0c 76 41 3f 71 41 8001 72 10 08 0b`
          - xs-json-middle: `20 00 41 06 76 41 3f 71 41 8001 72 10 08 0b`
        - xs-json-last: `20 00 41 3f 71 41 8001 72 10 08 0b`
    - xs-hex-record: `{{size:xs-hex-body}}`
      - xs-hex-body: `00 20 00 41 30 6b 41 09 4d 04 40 20 00 41 30 6b 0f 0b 20 00 41 20 72 41 e100 6b 41 05 4d 04 40 20 00 41 20 72 41 d700 6b 0f 0b 41 7f 0b`

Scalar locals: start/end 0/1, scalar 2, pending surrogate 3. Name scanner:
cursor/end 0/1, candidate next cursor 2. Entity decoder:
cursor/end 0/1, value 2, radix 3, digit 4, digit count 5, name start 6,
name length 7. String decoder: start/end/output/mode 0..3, scalar 4.
