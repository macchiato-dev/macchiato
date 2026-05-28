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

class GuestNode {
  constructor(owner) {
    this.ownerDocument = owner;
    this.parentNode = null;
    this.children = [];
  }

  appendChild(child) {
    this.ownerDocument.domUse.validateAppend(this, child);
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index === -1) throw new Error("Child not found");
    this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  replaceChildren(...children) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    for (const child of children) this.appendChild(child);
  }
}

class GuestText extends GuestNode {
  constructor(owner, text) {
    super(owner);
    this.tagName = "#text";
    this.textContent = String(text);
  }
}

class GuestElement extends GuestNode {
  constructor(owner, tagName) {
    super(owner);
    this.tagName = String(tagName).toLowerCase();
    this.attributes = {};
    this._style = {};
    this._textContent = "";
  }

  get textContent() {
    if (this.children.length) {
      return this.children.map((child) => child.textContent || "").join("");
    }
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
    for (const child of this.children) child.parentNode = null;
    this.children = [];
  }

  get id() {
    return this.attributes.id || "";
  }

  set id(value) {
    this.setAttribute("id", value);
  }

  get className() {
    return this.attributes.class || "";
  }

  set className(value) {
    this.setAttribute("class", value);
  }

  get style() {
    return new Proxy(this._style, {
      set: (target, property, value) => {
        this.ownerDocument.domUse.styleUse.validateInline(property, value);
        target[property] = String(value);
        return true;
      },
      deleteProperty: (target, property) => {
        delete target[property];
        return true;
      },
    });
  }

  get styleText() {
    return Object.entries(this._style)
      .map(([property, value]) => `${this.ownerDocument.domUse.styleUse.normalizeProperty(property)}: ${value}`)
      .join("; ");
  }

  setAttribute(name, value) {
    this.ownerDocument.domUse.assertAllowedAttr(this.tagName, name, value);
    if (String(name).toLowerCase() === "style") {
      for (const decl of String(value).split(";")) {
        const [property, ...rest] = decl.split(":");
        if (property && rest.length) this.style[property.trim()] = rest.join(":").trim();
      }
      return;
    }
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }
}

class GuestDocument {
  constructor(domUse) {
    this.domUse = domUse;
    this.body = new GuestElement(this, "body");
  }

  createElement(tagName) {
    return this.domUse.createElement(tagName, this);
  }

  createTextNode(text) {
    return new GuestText(this, text);
  }
}

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
    return new GuestDocument(this);
  }

  createElement(tagName, ownerDocument = null) {
    const tag = String(tagName).toLowerCase();
    this.assertAllowedNode(tag);
    const owner = ownerDocument || new GuestDocument(this);
    return new GuestElement(owner, tag);
  }

  /**
   * Set a node's children by parsing an HTML string.
   * Delegates parsing to html-use with dom-use's factory injected.
   */
  setInnerHTML(node, html) {
    const fragment = parseHTML(html, {
      createElement: (tag) => this.createElement(tag),
      createTextNode: (text) => node.ownerDocument?.createTextNode(text) || { tagName: "#text", textContent: text },
      schema: this.schema,
      styleUse: this.styleUse,
    });
    node.replaceChildren(...fragment.children);
  }

  /**
   * Serialize a node's children to HTML.
   * Delegates to html-use.
   */
  getInnerHTML(node) {
    return (node.children || []).map((child) => serializeHTML(child)).join("");
  }

  /**
   * Serialize a node and its children to HTML.
   */
  getOuterHTML(node) {
    return serializeHTML({ ...node, outer: true });
  }

  allowedNode(tagName) {
    const nodes = this.schema.nodes || {};
    return Object.keys(nodes).length === 0 || Boolean(nodes[String(tagName).toLowerCase()]);
  }

  allowedAttr(tagName, attr, value) {
    const nodes = this.schema.nodes || {};
    if (Object.keys(nodes).length === 0) return true;
    const tag = String(tagName).toLowerCase();
    const name = String(attr).toLowerCase();
    const allowed = [
      ...(this.schema.globalAttrs || []),
      ...(nodes[tag]?.attrs || []),
    ];
    if (allowed.includes("*")) return true;
    if (allowed.includes(name)) return true;
    if (allowed.some((entry) => entry.endsWith("*") && name.startsWith(entry.slice(0, -1)))) return true;
    void value;
    return false;
  }

  allowedChild(parentTag, childTag) {
    const nodes = this.schema.nodes || {};
    if (String(parentTag) === "#fragment") return true;
    if (Object.keys(nodes).length === 0) return true;
    const parent = nodes[String(parentTag).toLowerCase()];
    if (!parent) return false;
    const child = String(childTag).toLowerCase();
    const allowed = parent.children || [];
    return allowed.includes("*") || allowed.includes(child);
  }

  assertAllowedNode(tagName) {
    if (!this.allowedNode(tagName)) throw new Error(`Node not allowed: ${tagName}`);
  }

  assertAllowedAttr(tagName, attr, value) {
    if (!this.allowedAttr(tagName, attr, value)) {
      throw new Error(`Attribute not allowed on ${tagName}: ${attr}`);
    }
  }

  validateAppend(parent, child) {
    if (!this.allowedChild(parent.tagName, child.tagName)) {
      throw new Error(`Child ${child.tagName} not allowed in ${parent.tagName}`);
    }
    const maxDepth = this.schema.maxDepth;
    if (maxDepth && this.depth(parent) + this.height(child) > maxDepth) {
      throw new Error(`DOM tree exceeds maxDepth ${maxDepth}`);
    }
  }

  depth(node) {
    let depth = 1;
    let current = node;
    while (current.parentNode) {
      depth++;
      current = current.parentNode;
    }
    return depth;
  }

  height(node) {
    if (!node.children?.length) return 1;
    return 1 + Math.max(...node.children.map((child) => this.height(child)));
  }
}
