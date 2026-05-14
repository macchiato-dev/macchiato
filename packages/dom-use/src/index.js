/**
 * @macchiato-dev/dom-use
 *
 * Structured DOM access according to a schema.
 */

import { StyleUse } from "@macchiato-dev/style-use";

export class DomUse {
  /**
   * @param {object} schema
   * @param {StyleUse} [styleUse]
   */
  constructor(schema = {}, styleUse) {
    this.schema = schema;
    this.styleUse = styleUse || new StyleUse();
  }

  /**
   * Validate that a node type is permitted.
   * @param {string} tagName
   * @returns {boolean}
   */
  allowedNode(tagName) {
    // TODO: implement against schema
    void tagName;
    return true;
  }

  /**
   * Validate that an attribute is permitted on a node.
   * @param {string} tagName
   * @param {string} attr
   * @param {string} value
   * @returns {boolean}
   */
  allowedAttr(tagName, attr, value) {
    // TODO: implement against schema
    void tagName;
    void attr;
    void value;
    return true;
  }

  /**
   * Validate that a child is permitted inside a parent.
   * @param {string} parentTag
   * @param {string} childTag
   * @returns {boolean}
   */
  allowedChild(parentTag, childTag) {
    // TODO: implement against schema
    void parentTag;
    void childTag;
    return true;
  }
}
