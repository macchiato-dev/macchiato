/**
 * @macchiato-dev/build-static
 * Minimal partial VDOM for server-side rendering on Node and Deno.
 * Exports a document compatible with render-layout and render-prose.
 */

/**
 * @param {string} str
 * @returns {string}
 */
function escapeText(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * @param {string} str
 * @returns {string}
 */
function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class VText {
  /** @type {string} */
  #text;

  /** @param {string} text */
  constructor(text) {
    this.#text = String(text);
  }

  /** @returns {string} */
  get textContent() {
    return this.#text;
  }

  /** @returns {string} */
  toHTML() {
    return escapeText(this.#text);
  }
}

export class VElement {
  /** @type {string} */
  #tagName;
  /** @type {(VElement | VText)[]} */
  #children = [];
  /** @type {Map<string, string>} */
  #attributes = new Map();
  /** @type {string | null} */
  #text = null;

  /** @param {string} tagName */
  constructor(tagName) {
    this.#tagName = tagName;
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  setAttribute(name, value) {
    this.#attributes.set(name, String(value));
  }

  /**
   * @param {VElement | VText} child
   * @returns {VElement | VText}
   */
  appendChild(child) {
    this.#text = null;
    this.#children.push(child);
    return child;
  }

  /**
   * Replaces all children. Called with no arguments to clear.
   * @param {...(VElement | VText)} children
   */
  replaceChildren(...children) {
    this.#text = null;
    this.#children = children;
  }

  /** @param {string} value */
  set textContent(value) {
    this.#children = [];
    this.#text = String(value);
  }

  /** @returns {string} */
  get textContent() {
    if (this.#text !== null) return this.#text;
    return this.#children.map(c => c.textContent).join('');
  }

  /** @returns {string} */
  toHTML() {
    const attrs = [...this.#attributes]
      .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
      .join('');
    const content = this.#text !== null
      ? escapeText(this.#text)
      : this.#children.map(c => c.toHTML()).join('');
    return `<${this.#tagName}${attrs}>${content}</${this.#tagName}>`;
  }
}

export class VDocument {
  /** @type {VElement} */
  #titleEl;
  /** @type {VElement} */
  head;
  /** @type {VElement} */
  body;

  constructor() {
    this.#titleEl = new VElement('title');
    this.head = new VElement('head');
    this.body = new VElement('body');
    this.head.appendChild(this.#titleEl);
  }

  /**
   * @param {string} tagName
   * @returns {VElement}
   */
  createElement(tagName) {
    return new VElement(tagName);
  }

  /**
   * @param {string} text
   * @returns {VText}
   */
  createTextNode(text) {
    return new VText(text);
  }

  /** @param {string} value */
  set title(value) {
    this.#titleEl.textContent = value;
  }

  /** @returns {string} */
  get title() {
    return this.#titleEl.textContent;
  }

  /** @returns {string} */
  toHTML() {
    return (
      '<!DOCTYPE html>\n' +
      '<html>\n' +
      this.head.toHTML() + '\n' +
      this.body.toHTML() + '\n' +
      '</html>\n'
    );
  }
}

export const document = new VDocument();
