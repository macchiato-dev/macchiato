/**
 * @macchiato-dev/content-parse-small
 * A low-level Markdown parser that writes hypertokens directly to a shared buffer.
 */
export class ProseParser {
  /** @type {string} */
  #input;
  /** @type {ArrayBuffer} */
  #buffer;
  /** @type {Uint8Array} */
  #view;
  /** @type {number} */
  #offset = 0;
  /** @type {TextEncoder} */
  #encoder = new TextEncoder();

  /**
   * @param {string} input - The raw Markdown string.
   * @param {number} [initialCapacity=2048] - Starting size of the internal buffer.
   */
  constructor(input, initialCapacity = 2048) {
    this.#input = input;
    this.#buffer = new ArrayBuffer(initialCapacity);
    this.#view = new Uint8Array(this.#buffer);
  }

  /**
   * Access the current output slice without copying the underlying buffer.
   * @returns {Uint8Array}
   */
  get output() {
    return this.#view.subarray(0, this.#offset);
  }

  /**
   * Parses the input string and writes hypertokens into the internal buffer.
   * Token format is defined in @macchiato-dev/content-render-small.
   *
   * A single regex drives the whole scan. Named groups identify the token
   * type. \k<fence> lets the engine match the closing fence without any
   * manual character-counting loop. Blank lines are consumed in-place so
   * the regex never has to skip over them separately.
   */
  parse() {
    this.#offset = 0;
    const src = this.#input;

    // Constructed as a string so that backtick characters never appear inside a
    // regex literal — editors that track template-literal depth miscolour
    // everything after an unmatched backtick in a regex.
    const bt = '`';

    // One regex drives the entire block scan.  Each alternative uses a named
    // group so the dispatch below can identify which token was matched.
    //
    //  blank   [ \t]*\n
    //          A line that is empty or contains only spaces/tabs.  Consumed
    //          silently; blank lines separate blocks but carry no tokens.
    //
    //  fence   (`{3,}|~{3,})
    //          Opening fence: three or more backticks or tildes captured as
    //          <fence>.  The same string is referenced later by \k<fence>, so
    //          the engine itself finds the matching closing fence — no manual
    //          character-counting loop required.  [\s\S]*? is a lazy dotall
    //          span that lets the fence backreference stop at the first valid
    //          close, which means blank lines inside the block are matched
    //          correctly.  The trailing [^\n]*(?:\n|$) discards any info-string
    //          on the closing fence line.
    //
    //  hashes  #{1,8}
    //          ATX heading marker.  The level is encoded in the byte token as
    //          (count - 1) in the lower three bits.
    //
    //  para    (?!`{3,}|~{3,})[^\n]*\S[^\n]*
    //          One or more non-blank lines.  The negative lookahead at the
    //          start of each line prevents a fence opening from being swallowed
    //          into a paragraph — it falls to the catch-all instead and errors.
    //          \S inside the line pattern ensures the line contains at least one
    //          non-whitespace character (blank lines are already handled above).
    //
    //  (catch-all)  [^\n]+(?:\n|$)
    //          No named group.  Anything that reaches here is invalid input.
    //          The + (not *) prevents an empty match at EOF after all valid
    //          tokens have been consumed.
    const tokenRe = new RegExp(
      '(?<blank>[ \\t]*\\n)' +
      '|(?<fence>' + bt + '{3,}|~{3,})(?<lang>[^\\n]*)\\n(?<content>[\\s\\S]*?)\\n?\\k<fence>[^\\n]*(?:\\n|$)' +
      '|(?<hashes>#{1,8})[ \\t]+(?<htxt>[^\\n]*)(?:\\n|$)' +
      '|(?<para>(?!' + bt + '{3,}|~{3,})[^\\n]*\\S[^\\n]*(?:\\n(?!' + bt + '{3,}|~{3,})[^\\n]*\\S[^\\n]*)*(?:\\n|$))' +
      '|[^\\n]+(?:\\n|$)',
      'g',
    );

    // Applied only when the catch-all fires, to produce a specific error
    // message.  Kept separate rather than added as a named group in tokenRe
    // so it does not interfere with the main scan.
    const invalidRe = new RegExp(
      '(?<unclosedFence>' + bt + '{3,}|~{3,})',
    );

    let m;
    while ((m = tokenRe.exec(src)) !== null) {
      const { blank, fence, lang, content, hashes, htxt, para } = m.groups;

      if (blank !== undefined) {
        continue;
      } else if (fence !== undefined) {
        // Fenced code block: 0x01 + lang string + content string
        this.#writeUint8(0x01);
        this.#writeString(lang.trim());
        this.#writeString(content);
      } else if (hashes !== undefined) {
        // Header: 00001xxx (lower 3 bits = level - 1)
        this.#writeUint8(0x08 | (hashes.length - 1));
        this.#parseInline(htxt);
      } else if (para !== undefined) {
        // Paragraph: 0x00
        this.#writeUint8(0x00);
        this.#parseInline(para.trim());
      } else {
        // Catch-all fired: classify and throw
        if (invalidRe.test(m[0])) {
          throw new Error('Unclosed code fence');
        }
        throw new Error('Unexpected input at position ' + m.index);
      }
    }
  }

  /**
   * Emits an inline token sequence for text containing bold/italic markers,
   * terminated by 0x02 (end-of-inline). Uses a stack to enforce well-formed
   * (properly nested) spans — a closing marker only fires when it matches the
   * innermost open span; otherwise it is treated as an opener, which the
   * auto-close at the end will close. This mirrors how the DOM works: the
   * structure is always a tree, never crossing spans.
   * @param {string} text
   * @private
   */
  #parseInline(text) {
    const stack = []; // 'em' | 'strong'
    const bt = '`';

    // Alternatives are tried left-to-right; order matters:
    //
    //  \\[*_`]
    //          CommonMark backslash escape.  The character after the backslash
    //          is emitted literally.  Tried first so \* \_ \` are never seen
    //          by the delimiter alternatives below.
    //
    //  `[^`]+`
    //          Single-backtick code span.  Content must be non-empty ([^`]+
    //          rather than [^`]*) so that `` (two adjacent backticks) does NOT
    //          match here and falls to the error alternative instead.  This
    //          subset only supports single-backtick delimiters; multi-backtick
    //          spans (CommonMark's way to include a literal backtick inside
    //          code) belong in a larger variant and are rejected here.
    //
    //  `+
    //          Error sentinel: one or more consecutive backticks that were not
    //          consumed by the code-span alternative.  This covers unclosed
    //          spans, empty spans (``), and multi-backtick delimiters (`` `` ``).
    //
    //  **  __  *  _
    //          Bold and italic delimiters.  ** and __ must precede * and _ so
    //          the two-character token wins over two adjacent single-character
    //          tokens.
    //
    //  [^*_\\`]+
    //          Plain text run.  Excludes every character that opens an
    //          alternative above, so the run ends as soon as a delimiter is
    //          encountered.
    const inlineRe = new RegExp(
      '\\\\[*_' + bt + ']' +
      '|' + bt + '[^' + bt + ']+' + bt +
      '|' + bt + '+' +
      '|\\*\\*|__' +
      '|\\*|_' +
      '|[^*_\\\\' + bt + ']+',
      'g',
    );
    let m;
    while ((m = inlineRe.exec(text)) !== null) {
      const tok = m[0];
      if (tok[0] === '\\') {
        // Escaped delimiter — emit the literal character after the backslash
        this.#writeString(tok[1]);
      } else if (tok[0] === bt) {
        // Matched either `[^`]+` (valid) or `+ (error).  Distinguish by
        // checking that the token has content between the two delimiting
        // backticks: length >= 3 and the second character is not a backtick
        // (which would mean the opening delimiter is more than one backtick).
        if (tok.length >= 3 && tok[1] !== bt) {
          this.#writeUint8(0x20);
          this.#writeString(tok.slice(1, -1));
        } else {
          throw new Error('Invalid backtick sequence in inline content');
        }
      } else {
        const type = (tok === '**' || tok === '__') ? 'strong'
                   : (tok === '*'  || tok === '_')  ? 'em'
                   : null;
        if (type) {
          if (stack.length > 0 && stack[stack.length - 1] === type) {
            stack.pop();
            this.#writeUint8(type === 'strong' ? 0x19 : 0x11); // close
          } else {
            stack.push(type);
            this.#writeUint8(type === 'strong' ? 0x18 : 0x10); // open
          }
        } else {
          this.#writeString(tok);
        }
      }
    }
    if (stack.length > 0) {
      throw new Error(`Unclosed ${stack[stack.length - 1]} in inline content`);
    }
    this.#writeUint8(0x02); // end-of-inline
  }

  /**
   * @param {number} byte
   * @private
   */
  #writeUint8(byte) {
    this.#ensureCapacity(1);
    this.#view[this.#offset++] = byte;
  }

  /**
   * Encodes a string using the hypertoken string format.
   * @param {string} text
   * @private
   */
  #writeString(text) {
    const bytes = this.#encoder.encode(text);
    const len = bytes.length;

    if (len === 0) {
      // Empty string: 0x9F
      this.#writeUint8(0x9f);
      return;
    }

    if (len >= 1 && len <= 32) {
      // Short string: 101xxxxx (lower 5 bits = len - 1)
      this.#writeUint8(0xa0 | (len - 1));
    } else if (len <= 255) {
      // String8: 0xC0 + 1-byte length
      this.#writeUint8(0xc0);
      this.#writeUint8(len);
    } else if (len <= 65535) {
      // String16: 0xC1 + 2-byte big-endian length
      this.#writeUint8(0xc1);
      this.#ensureCapacity(2);
      new DataView(this.#buffer).setUint16(this.#offset, len, false);
      this.#offset += 2;
    } else {
      throw new Error('String length exceeds String16 limit (64KB)');
    }

    this.#ensureCapacity(len);
    this.#view.set(bytes, this.#offset);
    this.#offset += len;
  }

  /**
   * Checks if enough space is available for n additional bytes.
   * @param {number} additional
   * @private
   */
  #ensureCapacity(additional) {
    if (this.#offset + additional > this.#buffer.byteLength) {
      const newSize = Math.max(
        this.#buffer.byteLength * 2,
        this.#offset + additional,
      );
      const newBuffer = new ArrayBuffer(newSize);
      const newView = new Uint8Array(newBuffer);
      newView.set(this.#view);
      this.#buffer = newBuffer;
      this.#view = newView;
    }
  }
}
