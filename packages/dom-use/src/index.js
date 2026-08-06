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

export const URL_CAPABILITY_ATTRIBUTES = Object.freeze([
  "action",
  "archive",
  "background",
  "cite",
  "codebase",
  "data",
  "formaction",
  "href",
  "icon",
  "imagesrcset",
  "longdesc",
  "manifest",
  "ping",
  "poster",
  "profile",
  "src",
  "srcset",
  "usemap",
  "xlink:href",
]);
const URL_ATTRS = new Set(URL_CAPABILITY_ATTRIBUTES);

const DEFAULT_LIMITS = {
  maxTextLength: 10000,
  maxEventNameLength: 64,
  maxAttributeNameLength: 128,
  maxAttributeValueLength: 2048,
  maxAttributes: 32,
  maxNodes: 1000,
};

const DEFAULT_GAS = {
  enabled: true,
  tank: {
    init: 100000,
    idle: 20000,
    event: 8000,
  },
  refill: {
    amount: 1000,
    intervalMs: 1000,
  },
  costs: {
    createElement: 4,
    createTextNode: 4,
    appendChild: 2,
    insertBefore: 3,
    removeChild: 2,
    replaceChildren: 4,
    setTextContent: { base: 2, perChar: 1, charUnit: 64 },
    setInnerHTML: { base: 8, perNode: 3, perChar: 1, charUnit: 128 },
    setAttribute: { base: 3, perChar: 1, charUnit: 64 },
    removeAttribute: 1,
    setStyle: { base: 3, perChar: 1, charUnit: 64 },
    addEventListener: 2,
    eventTarget: 1,
    eventPayload: { base: 2, perChar: 1, charUnit: 64 },
  },
};

const TROUBLESOME_CONTENT_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069\uFFFE\uFFFF]/u;
const EVENT_PAYLOAD_FIELDS = {
  blur: ["value", "checked", "controls"],
  change: ["value", "checked", "controls"],
  click: ["value", "checked", "controls"],
  dblclick: ["value", "checked", "controls"],
  dragover: ["value", "checked", "controls", "dataTransfer"],
  dragstart: ["value", "checked", "controls", "dataTransfer"],
  drop: ["value", "checked", "controls", "dataTransfer"],
  keydown: ["value", "checked", "controls", "key"],
};

function patternMatches(pattern, value) {
  if (pattern instanceof RegExp) return pattern.test(value);
  if (typeof pattern === "string") return new RegExp(pattern).test(value);
  if (typeof pattern === "function") return pattern(value);
  return false;
}

function mergeGasConfig(config = {}) {
  return {
    ...DEFAULT_GAS,
    ...config,
    tank: { ...DEFAULT_GAS.tank, ...(config.tank || {}) },
    refill: { ...DEFAULT_GAS.refill, ...(config.refill || {}) },
    costs: { ...DEFAULT_GAS.costs, ...(config.costs || {}) },
  };
}

function positiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function stringLength(...values) {
  return values.reduce((sum, value) => sum + String(value ?? "").length, 0);
}

function treeSize(node) {
  if (!node) return 0;
  return 1 + (node.children || []).reduce((sum, child) => sum + treeSize(child), 0);
}

function estimateHtmlNodeCount(html) {
  const source = String(html);
  let count = 0;
  let lastIndex = 0;
  const tagRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)([^>]*)>/g;
  for (const match of source.matchAll(tagRe)) {
    if (source.slice(lastIndex, match.index).trim()) count++;
    lastIndex = match.index + match[0].length;
    if (!match[0].startsWith("<!--") && !match[0].startsWith("</")) count++;
  }
  if (source.slice(lastIndex).trim()) count++;
  return count;
}

export class DomUseGasError extends Error {
  constructor(message) {
    super(message);
    this.name = "DomUseGasError";
  }
}

class GuestNode {
  constructor(owner) {
    this.ownerDocument = owner;
    this.parentNode = null;
    this.children = [];
  }

  appendChild(child) {
    this.ownerDocument.domUse.validateAppend(this, child);
    this.ownerDocument.domUse.spendGas(this.ownerDocument, "appendChild");
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(newNode, referenceNode) {
    if (referenceNode === null || referenceNode === undefined) {
      return this.appendChild(newNode);
    }
    const index = this.children.indexOf(referenceNode);
    if (index === -1) throw new Error("Reference child not found");
    this.ownerDocument.domUse.validateAppend(this, newNode);
    this.ownerDocument.domUse.spendGas(this.ownerDocument, "insertBefore");
    if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
    newNode.parentNode = this;
    this.children.splice(index, 0, newNode);
    return newNode;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index === -1) throw new Error("Child not found");
    this.ownerDocument.domUse.spendGas(this.ownerDocument, "removeChild");
    this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  replaceChildren(...children) {
    this.ownerDocument.domUse.spendGas(this.ownerDocument, "replaceChildren", {
      nodes: children.reduce((sum, child) => sum + treeSize(child), 0),
    });
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
    this.ownerDocument.domUse.spendGas(this.ownerDocument, "setTextContent", {
      textLength: String(value).length,
    });
    this._textContent = String(value);
  }
}

class GuestElement extends GuestNode {
  constructor(owner, tagName) {
    super(owner);
    this.tagName = String(tagName).toLowerCase();
    this.attributes = {};
    this.events = new Set();
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
    this.ownerDocument.domUse.spendGas(this.ownerDocument, "setTextContent", {
      textLength: String(value).length,
    });
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
        this.ownerDocument.domUse.spendGas(this.ownerDocument, "setStyle", {
          textLength: stringLength(property, value),
        });
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
    this.ownerDocument.domUse.assertAllowedAttr(this, name, value);
    this.ownerDocument.domUse.assertAttributeBudget(this, name);
    this.ownerDocument.domUse.spendGas(this.ownerDocument, "setAttribute", {
      textLength: stringLength(name, value),
    });
    if (String(name).toLowerCase() === "style") {
      for (const decl of String(value).split(";")) {
        const [property, ...rest] = decl.split(":");
        if (property && rest.length) this.style[property.trim()] = rest.join(":").trim();
      }
      return;
    }
    this.attributes[name] = String(value);
    if (this.tagName === "a" && String(name).toLowerCase() === "href"
      && this.ownerDocument.domUse.schema.links?.addTargetBlank === true
      && this.attributes.target === undefined) {
      this.ownerDocument.domUse.validateAttributeValue("_blank");
      this.ownerDocument.domUse.assertAttributeBudget(this, "target");
      this.attributes.target = "_blank";
    }
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  removeAttribute(name) {
    this.ownerDocument.domUse.spendGas(this.ownerDocument, "removeAttribute");
    delete this.attributes[name];
  }

  addEventListener(event) {
    this.ownerDocument.domUse.registerEventListener(this, event);
  }

  addClass(...classes) {
    const next = new Set(this.className.split(/\s+/).filter(Boolean));
    for (const className of classes) if (className) next.add(String(className));
    this.className = Array.from(next).join(" ");
  }

  removeClass(...classes) {
    const next = new Set(this.className.split(/\s+/).filter(Boolean));
    for (const className of classes) next.delete(String(className));
    this.className = Array.from(next).join(" ");
  }

  toggleClass(className) {
    const next = new Set(this.className.split(/\s+/).filter(Boolean));
    const value = String(className);
    if (next.has(value)) {
      next.delete(value);
      this.className = Array.from(next).join(" ");
      return false;
    }
    next.add(value);
    this.className = Array.from(next).join(" ");
    return true;
  }

  hasClass(className) {
    return this.className.split(/\s+/).filter(Boolean).includes(String(className));
  }
}

class GuestDocument {
  constructor(domUse) {
    this.domUse = domUse;
    this.createdNodes = 0;
    this.gas = domUse.createGasState("init");
    this.body = new GuestElement(this, "body");
  }

  createElement(tagName) {
    return this.domUse.createElement(tagName, this);
  }

  createTextNode(text) {
    this.domUse.spendGas(this, "createTextNode");
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
    this._gasPolicy = mergeGasConfig(this.schema.gas || {});
  }

  createDocument() {
    return new GuestDocument(this);
  }

  createElement(tagName, ownerDocument = null) {
    const tag = String(tagName).toLowerCase();
    this.assertAllowedNode(tag);
    const owner = ownerDocument || new GuestDocument(this);
    this.spendGas(owner, "createElement");
    this.trackNode(owner);
    return new GuestElement(owner, tag);
  }

  limits() {
    return { ...DEFAULT_LIMITS, ...(this.schema.limits || {}) };
  }

  gasPolicy() {
    return this._gasPolicy;
  }

  createGasState(lifecycle = "init") {
    const policy = this.gasPolicy();
    const capacity = this.gasCapacity(lifecycle, policy);
    return {
      lifecycle,
      capacity,
      available: capacity,
      lastRefill: Date.now(),
    };
  }

  gasCapacity(lifecycle, policy = this.gasPolicy()) {
    return positiveNumber(policy.tank?.[lifecycle], positiveNumber(policy.tank?.idle, 0));
  }

  setGasLifecycle(ownerDocument, lifecycle, now = Date.now()) {
    if (!ownerDocument?.gas) return;
    this.refillGas(ownerDocument, now);
    const policy = this.gasPolicy();
    const capacity = this.gasCapacity(lifecycle, policy);
    ownerDocument.gas.lifecycle = lifecycle;
    ownerDocument.gas.capacity = capacity;
    ownerDocument.gas.available = Math.min(ownerDocument.gas.available, capacity);
  }

  refillGas(ownerDocument, now = Date.now()) {
    const policy = this.gasPolicy();
    if (policy.enabled === false || !ownerDocument?.gas) return;
    const intervalMs = positiveNumber(policy.refill?.intervalMs, 0);
    const amount = positiveNumber(policy.refill?.amount, 0);
    if (!intervalMs || !amount) return;
    const elapsed = Math.max(0, now - ownerDocument.gas.lastRefill);
    const intervals = Math.floor(elapsed / intervalMs);
    if (intervals <= 0) return;
    ownerDocument.gas.available = Math.min(
      ownerDocument.gas.capacity,
      ownerDocument.gas.available + intervals * amount,
    );
    ownerDocument.gas.lastRefill += intervals * intervalMs;
  }

  gasAvailable(ownerDocument, now = Date.now()) {
    this.refillGas(ownerDocument, now);
    return ownerDocument?.gas?.available ?? Infinity;
  }

  gasCost(operation, metrics = {}) {
    const cost = this.gasPolicy().costs?.[operation];
    if (typeof cost === "number") return cost;
    if (!cost || typeof cost !== "object") return 0;
    const base = Number(cost.base || 0);
    const perNode = Number(cost.perNode || 0) * Number(metrics.nodes || 0);
    const charUnit = positiveNumber(cost.charUnit, 1);
    const perChar = Number(cost.perChar || 0) * Math.ceil(Number(metrics.textLength || 0) / charUnit);
    return Math.ceil(base + perNode + perChar);
  }

  spendGas(ownerDocument, operation, metrics = {}, now = Date.now()) {
    const policy = this.gasPolicy();
    if (policy.enabled === false || !ownerDocument?.gas) return 0;
    this.refillGas(ownerDocument, now);
    const amount = this.gasCost(operation, metrics);
    if (!amount) return 0;
    if (ownerDocument.gas.available < amount) {
      throw new DomUseGasError(`DOM gas exhausted for ${operation}: need ${amount}, have ${ownerDocument.gas.available}`);
    }
    ownerDocument.gas.available -= amount;
    return amount;
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

  validateEventName(event) {
    const name = String(event);
    const maxEventNameLength = this.limits().maxEventNameLength;
    if (maxEventNameLength && name.length > maxEventNameLength) {
      throw new Error(`Event name exceeds maxEventNameLength ${maxEventNameLength}`);
    }
    this.validateContent(name, "event name");
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
    this.spendGas(node.ownerDocument, "setInnerHTML", {
      textLength: String(html).length,
      nodes: estimateHtmlNodeCount(html),
    });
    const fragment = parseHTML(html, {
      createElement: (tag) => node.ownerDocument?.createElement(tag) || this.createElement(tag),
      createTextNode: (text) => node.ownerDocument?.createTextNode(text) || { tagName: "#text", textContent: text },
      schema: this.schema,
      styleUse: this.styleUse,
    });
    node.replaceChildren(...fragment.children);
  }

  /**
   * Parse and sanitize an HTML string through this schema, returning safe HTML.
   *
   * When `container` is supplied, the input is treated as that container's
   * children, so parent/child rules are enforced for the target region that
   * will receive the resulting HTML.
   *
   * @param {string} html
   * @param {object} [options]
   * @param {string|object} [options.container] tag name or descriptor
   * @param {string} [options.container.tagName]
   * @param {object} [options.container.attributes]
   * @param {boolean} [options.includeContainer=false]
   * @param {boolean} [options.strict=false] reject instead of dropping invalid markup
   * @returns {string}
   */
  sanitizeHTML(html, options = {}) {
    const doc = this.createDocument();
    const container = options.container;
    if (container) {
      const descriptor = typeof container === "string" ? { tagName: container } : container;
      const node = doc.createElement(descriptor.tagName || "div");
      for (const [name, value] of Object.entries(descriptor.attributes || {})) {
        node.setAttribute(name, value);
      }
      if (options.strict === true) {
        const fragment = parseHTML(html, {
          createElement: (tag) => doc.createElement(tag),
          createTextNode: (text) => doc.createTextNode(text),
          schema: this.schema,
          styleUse: this.styleUse,
          strict: true,
        });
        node.replaceChildren(...fragment.children);
      } else {
        this.setInnerHTML(node, html);
      }
      return options.includeContainer ? this.getOuterHTML(node) : this.getInnerHTML(node);
    }

    const fragment = parseHTML(html, {
      createElement: (tag) => doc.createElement(tag),
      createTextNode: (text) => doc.createTextNode(text),
      schema: this.schema,
      styleUse: this.styleUse,
      strict: options.strict === true,
    });
    return serializeHTML(fragment);
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
    const tag = String(tagName).toLowerCase();
    const hasNodePolicy = Object.keys(nodes).length > 0 || Object.keys(this.schema.definitions || {}).length > 0;
    return !hasNodePolicy
      || Boolean(nodes[tag])
      || this.definitionsForTag(tag).length > 0;
  }

  definition(name) {
    return (this.schema.definitions || {})[String(name).replace(/^\$/, "")];
  }

  parseDefinitionSelector(definition) {
    const selector = String(definition?.element || definition?.selector || definition?.tag || "").trim();
    const match = selector.match(/^([a-zA-Z][\w:-]*)(?:((?:\.[a-zA-Z0-9_-]+)*))$/);
    if (!match) return { tag: selector.toLowerCase(), classes: [] };
    return {
      tag: match[1].toLowerCase(),
      classes: (match[2] || "").split(".").filter(Boolean),
    };
  }

  definitionsForTag(tagName) {
    const tag = String(tagName).toLowerCase();
    return Object.values(this.schema.definitions || {})
      .filter((definition) => this.parseDefinitionSelector(definition).tag === tag);
  }

  nodeClasses(node) {
    return new Set(String(node?.attributes?.class || "").split(/\s+/).filter(Boolean));
  }

  definitionMatchesNode(definition, node) {
    if (!node) return false;
    const selector = this.parseDefinitionSelector(definition);
    if (selector.tag !== String(node.tagName).toLowerCase()) return false;
    if (selector.classes.length === 0) return true;
    const classes = this.nodeClasses(node);
    return selector.classes.every((className) => classes.has(className));
  }

  matchingDefinitionsForNode(node) {
    return this.definitionsForTag(node?.tagName).filter((definition) => this.definitionMatchesNode(definition, node));
  }

  assertUnambiguousDefinitions(node, matches = this.matchingDefinitionsForNode(node)) {
    if (matches.length > 1) {
      const selectors = matches.map((definition) => definition.element || definition.selector || definition.tag).join(", ");
      throw new Error(`Ambiguous DOM definitions for ${node.tagName}: ${selectors}`);
    }
  }

  nodeRules(nodeOrTagName) {
    const tag = String(nodeOrTagName?.tagName || nodeOrTagName).toLowerCase();
    const matches = typeof nodeOrTagName === "object"
      ? this.matchingDefinitionsForNode(nodeOrTagName)
      : this.definitionsForTag(tag).filter((definition) => this.parseDefinitionSelector(definition).classes.length === 0);
    if (typeof nodeOrTagName === "object") this.assertUnambiguousDefinitions(nodeOrTagName, matches);
    return [
      this.schema.nodes?.[tag],
      ...matches,
    ].filter(Boolean);
  }

  allowedAttr(tagNameOrNode, attr, value) {
    this.validateAttributeName(attr);
    this.validateAttributeValue(value);
    const nodes = this.schema.nodes || {};
    const hasNodePolicy = Object.keys(nodes).length > 0 || Object.keys(this.schema.definitions || {}).length > 0;
    if (!hasNodePolicy) return true;
    const tag = String(tagNameOrNode?.tagName || tagNameOrNode).toLowerCase();
    const name = String(attr).toLowerCase();
    let ruleTarget = tagNameOrNode;
    if (name === "class" && typeof tagNameOrNode === "object") {
      const nextNode = {
        ...tagNameOrNode,
        attributes: { ...tagNameOrNode.attributes, class: String(value) },
      };
      this.assertUnambiguousDefinitions(nextNode);
      ruleTarget = nextNode;
    }
    const allowed = [
      ...(this.schema.globalAttrs || []),
      ...this.nodeRules(typeof ruleTarget === "object" ? ruleTarget : tag).flatMap((rule) => rule.attrs || []),
    ].map((entry) => String(entry).toLowerCase());
    if (allowed.includes("*")) return true;
    if (allowed.includes(name)) return true;
    if (allowed.some((entry) => entry.endsWith("*") && name.startsWith(entry.slice(0, -1)))) return true;
    void value;
    return false;
  }

  urlRuleFor(tagNameOrNode, attr) {
    const tag = String(tagNameOrNode?.tagName || tagNameOrNode).toLowerCase();
    const name = String(attr).toLowerCase();
    const nodeUrlRules = this.nodeRules(tagNameOrNode)
      .map((rule) => rule.urls)
      .filter((rule) => rule !== undefined);
    const globalUrls = this.schema.urls || {};

    for (const nodeUrls of nodeUrlRules) {
      if (nodeUrls === true || nodeUrls === false) return nodeUrls;
      if (nodeUrls?.[name] !== undefined) return nodeUrls[name];
      if (nodeUrls?.["*"] !== undefined) return nodeUrls["*"];
    }
    if (globalUrls === true || globalUrls === false) return globalUrls;
    if (globalUrls[`${tag}.${name}`] !== undefined) return globalUrls[`${tag}.${name}`];
    if (globalUrls[name] !== undefined) return globalUrls[name];
    if (globalUrls["*"] !== undefined) return globalUrls["*"];
    return undefined;
  }

  fragmentRuleFor(tagNameOrNode) {
    const nodeUrlRules = this.nodeRules(tagNameOrNode)
      .map((rule) => rule.urls)
      .filter((rule) => rule !== undefined);
    const globalUrls = this.schema.urls;

    for (const nodeUrls of nodeUrlRules) {
      if (nodeUrls === false) return false;
      if (nodeUrls?.fragments !== undefined) return nodeUrls.fragments;
    }
    if (globalUrls === false) return false;
    if (globalUrls?.fragments !== undefined) return globalUrls.fragments;
    return true;
  }

  attrUrls(attr, value) {
    const name = String(attr).toLowerCase();
    const text = String(value).trim();
    if (name === "srcset" || name === "imagesrcset") {
      return text
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean);
    }
    if (name === "ping" || name === "archive") return text.split(/\s+/).filter(Boolean);
    return [text];
  }

  validateAttrUrl(tagNameOrNode, attr, value) {
    const tagName = String(tagNameOrNode?.tagName || tagNameOrNode);
    const rule = this.urlRuleFor(tagNameOrNode, attr);
    for (const url of this.attrUrls(attr, value)) {
      if (!this.styleUse.rejectDangerousValue(url)) {
        throw new Error(`Disallowed URL on ${tagName}.${attr}`);
      }
      if (url.startsWith("#")) {
        const fragmentRule = this.fragmentRuleFor(tagNameOrNode);
        const matcher = typeof fragmentRule === "string" ? new RegExp(fragmentRule) : fragmentRule;
        if (matcher === false || (matcher !== true && !this.styleUse.isAllowedByRule(matcher, url, `${tagName}.${attr} fragment`))) {
          throw new Error(`Fragment URL not allowed on ${tagName}.${attr}: ${url}`);
        }
        continue;
      }
      if (rule === undefined || rule === false) {
        throw new Error(`URL attribute not allowed on ${tagName}: ${attr}`);
      }
      const urlRule = typeof rule === "string" ? new RegExp(rule) : rule;
      if (urlRule !== true && !this.styleUse.isAllowedByRule(urlRule, url, `${tagName}.${attr}`)) {
        throw new Error(`URL not allowed on ${tagName}.${attr}: ${url}`);
      }
    }
  }

  allowedChild(parentNodeOrTag, childNodeOrTag) {
    const nodes = this.schema.nodes || {};
    const parentTag = String(parentNodeOrTag?.tagName || parentNodeOrTag);
    if (parentTag === "#fragment") return true;
    const hasNodePolicy = Object.keys(nodes).length > 0 || Object.keys(this.schema.definitions || {}).length > 0;
    if (!hasNodePolicy) return true;
    const parent = nodes[parentTag.toLowerCase()];
    const child = String(childNodeOrTag?.tagName || childNodeOrTag).toLowerCase();
    const allowed = this.nodeRules(parentNodeOrTag).flatMap((rule) => rule.children || []);
    if (!parent && allowed.length === 0) return false;
    return allowed.some((entry) => this.childRuleMatches(entry, childNodeOrTag, child));
  }

  childRuleMatches(entry, childNodeOrTag, childTag = String(childNodeOrTag?.tagName || childNodeOrTag).toLowerCase()) {
    if (entry === "*") return true;
    if (typeof entry === "string") {
      const definition = this.definition(entry);
      if (definition) {
        const selector = this.parseDefinitionSelector(definition);
        if (selector.tag !== childTag) return false;
        return typeof childNodeOrTag === "object"
          ? this.definitionMatchesNode(definition, childNodeOrTag)
          : true;
      }
      return entry.toLowerCase() === childTag;
    }
    if (!entry || typeof entry !== "object") return false;
    if (entry.ref) return this.childRuleMatches(entry.ref, childTag);
    const alternatives = entry.oneOf || entry.anyOf || entry.alternates || entry.alternation;
    if (Array.isArray(alternatives)) {
      return alternatives.some((alternative) => this.childRuleMatches(alternative, childNodeOrTag, childTag));
    }
    if (entry.tag || entry.element || entry.selector) {
      const selector = this.parseDefinitionSelector(entry);
      return selector.tag === childTag;
    }
    return false;
  }

  allowedEvent(tagName, event) {
    this.validateEventName(event);
    const nodes = this.schema.nodes || {};
    if (Object.keys(nodes).length === 0) return false;
    const tag = String(tagName).toLowerCase();
    const name = String(event).toLowerCase();
    const allowed = [
      ...(this.schema.globalEvents || []),
      ...this.nodeRules(tag).flatMap((rule) => rule.events || []),
    ].map((entry) => String(entry).toLowerCase());
    return allowed.includes("*") || allowed.includes(name);
  }

  assertAllowedEvent(tagName, event) {
    if (!this.allowedEvent(tagName, event)) {
      throw new Error(`Event not allowed on ${tagName}: ${event}`);
    }
  }

  registerEventListener(node, event) {
    const name = String(event).toLowerCase();
    this.assertAllowedEvent(node.tagName, name);
    this.spendGas(node.ownerDocument, "addEventListener");
    node.events.add(name);
  }

  eventTarget(candidates, event) {
    const name = String(event).toLowerCase();
    this.validateEventName(name);
    for (const node of candidates) {
      if (!node?.events?.has(name)) continue;
      this.assertAllowedEvent(node.tagName, name);
      this.spendGas(node.ownerDocument, "eventTarget");
      return node;
    }
    return null;
  }

  sanitizeEventPayload(event, payload = {}) {
    const name = String(event).toLowerCase();
    this.validateEventName(name);
    const fields = new Set(EVENT_PAYLOAD_FIELDS[name] || ["value", "checked"]);
    const clean = {};
    if (fields.has("value")) clean.value = this.sanitizeEventText(payload.value || "", "event value");
    if (fields.has("checked")) clean.checked = Boolean(payload.checked);
    if (fields.has("key")) clean.key = this.sanitizeEventText(payload.key || "", "event key");
    if (fields.has("controls")) clean.controls = this.sanitizeEventControls(payload.controls);
    if (fields.has("dataTransfer")) clean.dataTransfer = this.sanitizeDataTransfer(payload.dataTransfer);
    return clean;
  }

  sanitizeEventText(value, kind) {
    const text = String(value);
    this.validateText(text);
    this.validateContent(text, kind);
    return text;
  }

  sanitizeEventControls(controls = []) {
    if (!Array.isArray(controls)) return [];
    return controls.map((control) => ({
      nodeId: this.sanitizeEventText(control.nodeId || "", "event control node id"),
      value: this.sanitizeEventText(control.value || "", "event control value"),
      checked: Boolean(control.checked),
    }));
  }

  sanitizeDataTransfer(dataTransfer = null) {
    if (!dataTransfer || typeof dataTransfer !== "object") return null;
    const data = {};
    for (const [type, value] of Object.entries(dataTransfer.data || {})) {
      data[this.sanitizeEventText(type, "dataTransfer type")] = this.sanitizeEventText(value, "dataTransfer value");
    }
    return {
      data,
      effectAllowed: this.sanitizeEventText(dataTransfer.effectAllowed || "move", "dataTransfer effectAllowed"),
    };
  }

  assertAllowedNode(tagName) {
    if (!this.allowedNode(tagName)) throw new Error(`Node not allowed: ${tagName}`);
  }

  assertAllowedAttr(tagNameOrNode, attr, value) {
    const tagName = String(tagNameOrNode?.tagName || tagNameOrNode);
    if (!this.allowedAttr(tagNameOrNode, attr, value)) {
      throw new Error(`Attribute not allowed on ${tagName}: ${attr}`);
    }
    if (URL_ATTRS.has(String(attr).toLowerCase())) {
      this.validateAttrUrl(tagNameOrNode, attr, value);
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
    if (!this.allowedChild(parent, child)) {
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
