/**
 * @macchiato-dev/dom-tiny
 * Minimal virtual DOM for server-side rendering and testing.
 * Provides VText, VElement, and VDocument — a DOM-like API
 * compatible with content and layout renderers.
 */

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

  /** @returns {string} */
  get tagName() {
    return this.#tagName;
  }

  /** @returns {Map<string, string>} */
  get attributes() {
    return this.#attributes;
  }

  /** @returns {(VElement | VText)[]} */
  get childNodes() {
    return this.#children;
  }

  /**
   * The raw text string when textContent setter was used; null when in
   * children mode. Needed by render-html to distinguish text mode from
   * children mode.
   * @returns {string | null}
   */
  get ownTextContent() {
    return this.#text;
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
}
