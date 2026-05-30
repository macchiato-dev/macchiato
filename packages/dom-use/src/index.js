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

const URL_ATTRS = new Set([
  "action",
  "background",
  "cite",
  "data",
  "formaction",
  "href",
  "icon",
  "manifest",
  "poster",
  "src",
  "srcset",
]);

const DEFAULT_LIMITS = {
  maxTextLength: 10000,
  maxAttributeNameLength: 128,
  maxAttributeValueLength: 2048,
  maxAttributes: 32,
  maxNodes: 1000,
};

const TROUBLESOME_CONTENT_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069\uFFFE\uFFFF]/u;

function patternMatches(pattern, value) {
  if (pattern instanceof RegExp) return pattern.test(value);
  if (typeof pattern === "string") return new RegExp(pattern).test(value);
  if (typeof pattern === "function") return pattern(value);
  return false;
}

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
    this._textContent = "";
    this.textContent = text;
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this.ownerDocument.domUse.validateText(value);
    this._textContent = String(value);
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
    this.ownerDocument.domUse.validateText(value);
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
    this.ownerDocument.domUse.assertAttributeBudget(this, name);
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
    this.createdNodes = 0;
    this.body = new GuestElement(this, "body");
  }

  createElement(tagName) {
    return this.domUse.createElement(tagName, this);
  }

  createTextNode(text) {
    this.domUse.trackNode(this);
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
    this.trackNode(owner);
    return new GuestElement(owner, tag);
  }

  limits() {
    return { ...DEFAULT_LIMITS, ...(this.schema.limits || {}) };
  }

  trackNode(ownerDocument) {
    const maxNodes = this.limits().maxNodes;
    if (maxNodes && ownerDocument.createdNodes + 1 > maxNodes) {
      throw new Error(`DOM document exceeds maxNodes ${maxNodes}`);
    }
    ownerDocument.createdNodes += 1;
  }

  validateContent(value, kind) {
    const text = String(value);
    const content = this.schema.content || {};
    if (content.allowTroublesomeSpecialCharacters !== true && TROUBLESOME_CONTENT_RE.test(text)) {
      throw new Error(`Troublesome special character in ${kind}`);
    }
    if (content.rejectPattern && patternMatches(content.rejectPattern, text)) {
      throw new Error(`Rejected content in ${kind}`);
    }
    if (content.allowedPattern && !patternMatches(content.allowedPattern, text)) {
      throw new Error(`Content not allowed in ${kind}`);
    }
  }

  validateText(value) {
    const text = String(value);
    const maxTextLength = this.limits().maxTextLength;
    if (maxTextLength && text.length > maxTextLength) {
      throw new Error(`Text exceeds maxTextLength ${maxTextLength}`);
    }
    this.validateContent(text, "text");
  }

  validateAttributeName(name) {
    const attr = String(name);
    const maxAttributeNameLength = this.limits().maxAttributeNameLength;
    if (maxAttributeNameLength && attr.length > maxAttributeNameLength) {
      throw new Error(`Attribute name exceeds maxAttributeNameLength ${maxAttributeNameLength}`);
    }
    this.validateContent(attr, "attribute name");
  }

  validateAttributeValue(value) {
    const attrValue = String(value);
    const maxAttributeValueLength = this.limits().maxAttributeValueLength;
    if (maxAttributeValueLength && attrValue.length > maxAttributeValueLength) {
      throw new Error(`Attribute value exceeds maxAttributeValueLength ${maxAttributeValueLength}`);
    }
    this.validateContent(attrValue, "attribute value");
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
    this.validateAttributeName(attr);
    this.validateAttributeValue(value);
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

  urlRuleFor(tagName, attr) {
    const tag = String(tagName).toLowerCase();
    const name = String(attr).toLowerCase();
    const nodes = this.schema.nodes || {};
    const nodeUrls = nodes[tag]?.urls || {};
    const globalUrls = this.schema.urls || {};

    if (nodeUrls === true || nodeUrls === false) return nodeUrls;
    if (globalUrls === true || globalUrls === false) return globalUrls;
    if (nodeUrls[name] !== undefined) return nodeUrls[name];
    if (globalUrls[name] !== undefined) return globalUrls[name];
    if (nodeUrls["*"] !== undefined) return nodeUrls["*"];
    if (globalUrls["*"] !== undefined) return globalUrls["*"];
    return undefined;
  }

  attrUrls(attr, value) {
    const name = String(attr).toLowerCase();
    const text = String(value).trim();
    if (name === "srcset") {
      return text
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean);
    }
    return [text];
  }

  validateAttrUrl(tagName, attr, value) {
    const rule = this.urlRuleFor(tagName, attr);
    if (rule === undefined || rule === false) {
      throw new Error(`URL attribute not allowed on ${tagName}: ${attr}`);
    }
    for (const url of this.attrUrls(attr, value)) {
      if (!this.styleUse.rejectDangerousValue(url)) {
        throw new Error(`Disallowed URL on ${tagName}.${attr}`);
      }
      if (rule !== true && !this.styleUse.isAllowedByRule(rule, url, `${tagName}.${attr}`)) {
        throw new Error(`URL not allowed on ${tagName}.${attr}: ${url}`);
      }
    }
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
    if (URL_ATTRS.has(String(attr).toLowerCase())) {
      this.validateAttrUrl(tagName, attr, value);
    }
  }

  assertAttributeBudget(node, attr) {
    const maxAttributes = this.limits().maxAttributes;
    const name = String(attr);
    if (
      maxAttributes
      && !Object.prototype.hasOwnProperty.call(node.attributes, name)
      && Object.keys(node.attributes).length >= maxAttributes
    ) {
      throw new Error(`Element exceeds maxAttributes ${maxAttributes}`);
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
