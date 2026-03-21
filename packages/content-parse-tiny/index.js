/**
 * @macchiato-dev/content-parse-tiny
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
   * Token format is defined in @macchiato-dev/content-render-tiny.
   *
   * A single regex drives the whole scan. Named groups identify the token
   * type. \k<fence> lets the engine match the closing fence without any
   * manual character-counting loop. Blank lines are consumed in-place so
   * the regex never has to skip over them separately.
   */
  parse() {
    this.#offset = 0;
    const src = this.#input;

    // Regex constructed as a string to keep backticks out of regex literals,
    // which confuses editors that track template-literal state.
    const bt = '`';
    const tokenRe = new RegExp(
      // Blank line (skip)
      '(?<blank>[ \\t]*\\n)' +
      // Fenced code block — closed: \k<fence> matches the closing fence
      '|(?<fence>' + bt + '{3,}|~{3,})(?<lang>[^\\n]*)\\n(?<content>[\\s\\S]*?)\\n?\\k<fence>[^\\n]*(?:\\n|$)' +
      // Header: 1–8 # chars followed by whitespace
      '|(?<hashes>#{1,8})[ \\t]+(?<htxt>[^\\n]*)(?:\\n|$)' +
      // Paragraph: one or more non-blank lines; the negative lookahead prevents
      // fence openings from being consumed here so they fall to the catch-all
      '|(?<para>(?!' + bt + '{3,}|~{3,})[^\\n]*\\S[^\\n]*(?:\\n(?!' + bt + '{3,}|~{3,})[^\\n]*\\S[^\\n]*)*(?:\\n|$))' +
      // Catch-all: no named group — anything reaching here is invalid.
      // Requires at least one non-newline char to avoid matching empty string at EOF.
      '|[^\\n]+(?:\\n|$)',
      'g',
    );

    // Used only when the catch-all fires, to produce a descriptive error.
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
    // \\[*_] handles CommonMark escaping: \* and \_ become literal characters.
    // ** and __ must be tried before * and _ so the longer token wins.
    const inlineRe = /\\[*_]|\*\*|__|\*|_|[^*_\\]+/g;
    let m;
    while ((m = inlineRe.exec(text)) !== null) {
      const tok = m[0];
      if (tok[0] === '\\') {
        // Escaped delimiter — emit the literal character
        this.#writeString(tok[1]);
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
