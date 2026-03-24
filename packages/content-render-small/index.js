/**
 * @macchiato-dev/content-render-small
 * Reads a hypertoken stream and renders prose into the DOM.
 * Token format is defined in this package's README.
 */

const MAX_BLOCKS_PER_PAGE   = 128;
const MAX_CHARS_PER_BLOCK   = 1024;
const MAX_CHARS_PER_HEADER  = 128;
const MAX_WORD_CODEPOINTS   = 64;  // max run of non-whitespace code points

const SANITIZE_RE = new RegExp(
  '[' +
  '\u0000-\u0008\u000B\u000C\u000E-\u001F' + // C0 controls (except tab, LF, CR)
  '\u007F-\u009F'                           + // DEL and C1 controls
  '\u00AD'                                  + // soft hyphen
  '\u200B-\u200F'                           + // zero-width chars and directional marks
  '\u202A-\u202E'                           + // BiDi embedding/override (Trojan Source)
  '\u2060-\u206F'                           + // invisible operators, BiDi isolates, deprecated
  '\uFDD0-\uFDEF'                           + // noncharacters
  '\uFEFF'                                  + // BOM
  '\uFFF9-\uFFFC\uFFFE\uFFFF'              + // interlinear annotation and noncharacters
  '\u{E000}-\u{F8FF}'                       + // BMP private use area
  '\u{E0000}-\u{E007F}'                     + // tags block
  '\u{F0000}-\u{10FFFF}'                    + // supplementary private use areas
  ']',
  'u',
);

/**
 * Throws if text contains code points that can break layouts or pose
 * security risks.
 * @param {string} text
 */
function assertSanitized(text) {
  if (SANITIZE_RE.test(text)) {
    throw new Error('Text contains disallowed characters');
  }
}

/**
 * Checks that no run of non-whitespace code points exceeds the limit.
 * Long unbreakable runs overflow their containers.
 * @param {string} text
 * @param {number} limit
 */
function checkWordLength(text, limit) {
  for (const word of text.split(/\s+/u).filter(Boolean)) {
    if ([...word].length > limit) {
      throw new Error(`Word exceeds limit of ${limit} code points without whitespace`);
    }
  }
}

export class ProseRenderer {
  /** @type {Document} */
  #document;
  /** @type {import('@macchiato-dev/layout-render-small').LayoutRenderer} */
  #layout;
  /** @type {boolean} */
  #sanitize;
  /** @type {string[]} */
  #allowedLinkHosts;
  /** @type {string[]} */
  #allowedImageHosts;
  /** @type {string[]} */
  #allowedIframeHosts;
  /** @type {TextDecoder} */
  #decoder = new TextDecoder();
  /** @type {number} */
  #maxBlocksPerPage;
  /** @type {number} */
  #maxCharsPerBlock;
  /** @type {number} */
  #maxCharsPerHeader;
  /** @type {number} */
  #maxWordCodepoints;
  /** @type {number} */
  #blockCount = 0;

  /**
   * @param {object} params
   * @param {Document} params.document
   * @param {import('@macchiato-dev/layout-render-small').LayoutRenderer} params.layout
   * @param {boolean} [params.sanitize=true] - Strip characters that can break
   *   layouts or pose security risks. Disable only for trusted input.
   * @param {string[]} [params.allowedLinkHosts=[]] - Hostnames whose links
   *   may be opened on click. Others are copy-only.
   * @param {string[]} [params.allowedImageHosts=[]] - Hostnames from which
   *   images may be loaded. Others require a click to reveal.
   * @param {string[]} [params.allowedIframeHosts=[]] - Hostnames from which
   *   sandboxed iframes may be embedded via fenced code blocks.
   */
  constructor({
    document,
    layout,
    sanitize: doSanitize = true,
    allowedLinkHosts = [],
    allowedImageHosts = [],
    allowedIframeHosts = [],
    maxBlocksPerPage = MAX_BLOCKS_PER_PAGE,
    maxCharsPerBlock = MAX_CHARS_PER_BLOCK,
    maxCharsPerHeader = MAX_CHARS_PER_HEADER,
    maxWordCodepoints = MAX_WORD_CODEPOINTS,
  }) {
    this.#document = document;
    this.#layout = layout;
    this.#sanitize = doSanitize;
    this.#allowedLinkHosts = allowedLinkHosts;
    this.#allowedImageHosts = allowedImageHosts;
    this.#allowedIframeHosts = allowedIframeHosts;
    this.#maxBlocksPerPage = maxBlocksPerPage;
    this.#maxCharsPerBlock = maxCharsPerBlock;
    this.#maxCharsPerHeader = maxCharsPerHeader;
    this.#maxWordCodepoints = maxWordCodepoints;
  }

  /**
   * Reads the hypertoken stream and applies it to the DOM.
   * @param {Uint8Array} input
   */
  render(input) {
    let i = 0;

    while (i < input.length) {
      const byte = input[i++];

      if (byte === 0x00) {
        // Paragraph: 0x00 followed by inline token sequence
        if (++this.#blockCount > this.#maxBlocksPerPage) {
          throw new Error(`Exceeded limit of ${this.#maxBlocksPerPage} blocks per page`);
        }
        const el = this.#document.createElement('p');
        i = this.#renderInlineContent(input, i, el);
        const text = el.textContent;
        if (text.length > this.#maxCharsPerBlock) {
          throw new Error(`Exceeded limit of ${this.#maxCharsPerBlock} characters per block`);
        }
        checkWordLength(text, this.#maxWordCodepoints);
        this.#layout.main.appendChild(el);
      } else if (byte === 0x01) {
        // Fenced code block: 0x01 + lang string + content string
        const [lang, langConsumed] = this.#readString(input, i);
        i += langConsumed;
        const [content, contentConsumed] = this.#readString(input, i);
        i += contentConsumed;
        if (this.#sanitize) {
          assertSanitized(lang);
          assertSanitized(content);
        }
        this.#renderFencedCode(lang, content);
      } else if ((byte & 0xf8) === 0x08) {
        // Header: 00001xxx (lower 3 bits = level - 1), followed by inline sequence
        if (++this.#blockCount > this.#maxBlocksPerPage) {
          throw new Error(`Exceeded limit of ${this.#maxBlocksPerPage} blocks per page`);
        }
        const level = (byte & 0x07) + 1;
        const el = this.#document.createElement(level <= 6 ? `h${level}` : 'p');
        if (level > 6) el.setAttribute('data-heading-level', level);
        i = this.#renderInlineContent(input, i, el);
        const text = el.textContent;
        if (text.length > this.#maxCharsPerHeader) {
          throw new Error(`Exceeded limit of ${this.#maxCharsPerHeader} characters per header`);
        }
        checkWordLength(text, this.#maxWordCodepoints);
        this.#layout.main.appendChild(el);
        if (level === 1) this.#layout.setContentTitle(text);
      }
    }
  }

  /**
   * Reads an inline token sequence into a container element, until 0x02
   * (end-of-inline). Maintains an element stack so that open/close tokens
   * build a proper DOM tree. Text segments are appended as text nodes.
   * @param {Uint8Array} input
   * @param {number} i - Starting offset (first byte of the inline sequence)
   * @param {import('@macchiato-dev/dom-tiny').VElement} container
   * @returns {number} Offset after the consumed inline sequence
   * @private
   */
  #renderInlineContent(input, i, container) {
    const stack = [container]; // innermost current element is always last

    while (i < input.length) {
      const byte = input[i];

      if (byte === 0x02) { i++; break; } // end-of-inline

      if (byte === 0x10) {
        i++;
        const em = this.#document.createElement('em');
        stack[stack.length - 1].appendChild(em);
        stack.push(em);
      } else if (byte === 0x11) {
        i++;
        if (stack.length > 1) stack.pop(); // em close
      } else if (byte === 0x18) {
        i++;
        const strong = this.#document.createElement('strong');
        stack[stack.length - 1].appendChild(strong);
        stack.push(strong);
      } else if (byte === 0x19) {
        i++;
        if (stack.length > 1) stack.pop(); // strong close
      } else if (byte === 0x20) {
        // Inline code — verbatim text, no nested markup
        i++;
        const [text, consumed] = this.#readString(input, i);
        i += consumed;
        if (this.#sanitize) assertSanitized(text);
        const code = this.#document.createElement('code');
        code.textContent = text;
        stack[stack.length - 1].appendChild(code);
      } else {
        // String token
        const [text, consumed] = this.#readString(input, i);
        i += consumed;
        if (this.#sanitize) assertSanitized(text);
        stack[stack.length - 1].appendChild(this.#document.createTextNode(text));
      }
    }

    return i;
  }

  /**
   * @param {string} lang - Language identifier, may be empty.
   * @param {string} safe - Code content, already checked.
   * @private
   */
  #renderFencedCode(lang, safe) {
    if (++this.#blockCount > this.#maxBlocksPerPage) {
      throw new Error(`Exceeded limit of ${this.#maxBlocksPerPage} blocks per page`);
    }
    if (safe.length > this.#maxCharsPerBlock) {
      throw new Error(`Exceeded limit of ${this.#maxCharsPerBlock} characters per block`);
    }
    const pre = this.#document.createElement('pre');
    const code = this.#document.createElement('code');
    if (lang) {
      code.setAttribute('class', `language-${lang}`);
    }
    code.textContent = safe;
    pre.appendChild(code);
    this.#layout.main.appendChild(pre);

    // TODO: when lang is 'iframe', parse the content for a URL and the size and
    // render as a sandboxed <iframe> if the host appears in this.#allowedIframeHosts.
    // (Consider providing a way to set the size of images as well - perhaps allowing
    // <img> tags)
  }

  /**
   * Reads a string token from the input at the given offset.
   * Returns the decoded string and the number of bytes consumed.
   * @param {Uint8Array} input
   * @param {number} offset
   * @returns {[string, number]}
   * @private
   */
  #readString(input, offset) {
    const first = input[offset];

    if (first === 0x9f) {
      // Empty string
      return ['', 1];
    }

    if ((first & 0xe0) === 0xa0) {
      // Short string: 101xxxxx (lower 5 bits = len - 1)
      const len = (first & 0x1f) + 1;
      return [this.#decoder.decode(input.subarray(offset + 1, offset + 1 + len)), 1 + len];
    } else if (first === 0xc0) {
      // String8: 0xC0 + 1-byte length
      const len = input[offset + 1];
      return [this.#decoder.decode(input.subarray(offset + 2, offset + 2 + len)), 2 + len];
    } else if (first === 0xc1) {
      // String16: 0xC1 + 2-byte big-endian length
      const len = (input[offset + 1] << 8) | input[offset + 2];
      return [this.#decoder.decode(input.subarray(offset + 3, offset + 3 + len)), 3 + len];
    }

    throw new Error(`Unexpected string token: 0x${first.toString(16)}`);
  }
}
