/**
 * @macchiato-dev/dom-use
 *
 * Structured DOM access according to a schema — the top-level capability.
 *
 * dom-use depends on html-use and style-use. It passes its createElement
 * factory and schema into html-use at runtime, avoiding a circular dependency.
 */

import { StyleUse } from "@macchiato-dev/style-use";
import { parseHTML, serializeHTML } from "@macchiato-dev/html-use";

export class DomUse {
  /**
   * @param {object} schema
   * @param {StyleUse} [styleUse]
   */
  constructor(schema = {}, styleUse) {
    this.schema = schema;
    this.styleUse = styleUse || new StyleUse();
  }

  createDocument() {
    // TODO: return a guest document root
    return {
      createElement: (tag) => this.createElement(tag),
      createTextNode: (text) => ({ tagName: "#text", textContent: text }),
    };
  }

  createElement(tagName) {
    // TODO: validate tagName against schema, return guest element
    void tagName;
    return { tagName, attributes: {}, children: [] };
  }

  /**
   * Set a node's children by parsing an HTML string.
   * Delegates parsing to html-use with dom-use's factory injected.
   */
  setInnerHTML(node, html) {
    const fragment = parseHTML(html, {
      createElement: (tag) => this.createElement(tag),
      schema: this.schema,
      styleUse: this.styleUse,
    });
    node.children = fragment.children;
  }

  /**
   * Serialize a node's children to HTML.
   * Delegates to html-use.
   */
  getInnerHTML(node) {
    return serializeHTML(node);
  }

  /**
   * Serialize a node and its children to HTML.
   */
  getOuterHTML(node) {
    return serializeHTML({ ...node, outer: true });
  }

  allowedNode(tagName) {
    void tagName;
    return true;
  }

  allowedAttr(tagName, attr, value) {
    void tagName; void attr; void value;
    return true;
  }

  allowedChild(parentTag, childTag) {
    void parentTag; void childTag;
    return true;
  }
}
