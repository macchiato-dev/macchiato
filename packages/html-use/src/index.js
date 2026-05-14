/**
 * @macchiato-dev/html-use
 *
 * HTML parser, serializer, and sanitizer — used by dom-use.
 *
 * html-use does NOT depend on dom-use. Instead, dom-use passes its
 * createElement factory and schema into html-use at runtime.
 */

import { StyleUse } from "@macchiato-dev/style-use";

/**
 * Parse an HTML string into a tree of guest nodes.
 *
 * @param {string} html
 * @param {object} options
 * @param {(tagName: string) => object} options.createElement — factory from dom-use
 * @param {object} [options.schema] — dom-use schema for validation
 * @param {StyleUse} [options.styleUse] — for CSS validation
 * @returns {object} root fragment node
 */
export function parseHTML(html, { createElement, schema, styleUse }) {
  // TODO: implement HTML parsing, use createElement to build nodes,
  // validate against schema, delegate style validation to styleUse
  void html;
  void createElement;
  void schema;
  void styleUse;
  return { children: [] };
}

/**
 * Serialize a guest node tree to an HTML string.
 *
 * @param {object} node — guest DOM node
 * @returns {string}
 */
export function serializeHTML(node) {
  // TODO: implement serialization
  void node;
  return "";
}

/**
 * Parse, validate against a schema, and return a clean HTML string.
 *
 * @param {string} html
 * @param {object} options
 * @param {object} [options.schema]
 * @param {StyleUse} [options.styleUse]
 * @returns {string} sanitized HTML
 */
export function sanitizeHTML(html, { schema, styleUse }) {
  // TODO: parse -> validate -> serialize
  void html;
  void schema;
  void styleUse;
  return "";
}
