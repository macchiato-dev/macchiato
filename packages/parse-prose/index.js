/**
 * @macchiato-dev/parse-prose
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
   * Token format is defined in @macchiato-dev/render-prose.
   */
  parse() {
    this.#offset = 0;

    const blocks = this.#input.split(/\n\s*\n/);

    for (let block of blocks) {
      block = block.trim();
      if (!block) continue;

      // Supports h1-h8; h7 and h8 are non-standard extended headings
      const headerMatch = block.match(/^(#{1,8})\s+(.*)/s);

      if (headerMatch) {
        // Header: 00001xxx (lower 3 bits = level - 1)
        const level = headerMatch[1].length;
        this.#writeUint8(0x08 | (level - 1));
        this.#writeString(headerMatch[2]);
      } else {
        // Paragraph: 0x00
        this.#writeUint8(0x00);
        this.#writeString(block);
      }
    }
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
