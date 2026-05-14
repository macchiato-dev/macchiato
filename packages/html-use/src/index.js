/**
 * @macchiato-dev/html-use
 *
 * Sandboxed innerHTML / outerHTML backend — parse, generate, hydrate.
 */

import { DomUse } from "@macchiato-dev/dom-use";

export class HtmlUse {
  /**
   * @param {DomUse} domUse
   */
  constructor(domUse) {
    this.domUse = domUse;
  }

  /**
   * Parse an HTML string and set it as a node's children.
   * Invalid nodes/attributes are stripped.
   * @param {object} node — guest DOM node
   * @param {string} html
   */
  setInnerHTML(node, html) {
    // TODO: parse html, validate against domUse schema, attach children
    void node;
    void html;
  }

  /**
   * Serialize a node's children to an HTML string.
   * @param {object} node — guest DOM node
   * @returns {string}
   */
  getInnerHTML(node) {
    // TODO: serialize children
    void node;
    return "";
  }

  /**
   * Serialize a node and its children to an HTML string.
   * @param {object} node — guest DOM node
   * @returns {string}
   */
  getOuterHTML(node) {
    // TODO: serialize node + children
    void node;
    return "";
  }

  /**
   * Hydrate a guest document from an HTML string.
   * @param {string} html
   * @returns {object} guest document
   */
  hydrate(html) {
    // TODO: parse full document
    void html;
    return { body: { children: [] } };
  }
}
