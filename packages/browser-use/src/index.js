function pattern(value, label) {
  if (value instanceof RegExp) return value;
  if (typeof value !== "string" || value.length > 2_000) throw new Error(`${label} must be a bounded pattern`);
  return new RegExp(value);
}

function attributeEntries(element) {
  return Array.from(element.attributes || [], (entry) => [String(entry.name), String(entry.value)]);
}

function elementChildren(element) {
  return Array.from(element.children || []).filter((child) => child?.nodeType === undefined || child.nodeType === 1);
}

export function compileDomShapePolicy(input = {}) {
  const tags = new Set((input.tags || []).map((tag) => String(tag).toLowerCase()));
  if (!tags.size) throw new Error("DOM shape policy requires tags");
  const attributes = Object.fromEntries(Object.entries(input.attributes || {}).map(([name, value]) => [
    name,
    value === true ? true : pattern(value, `attribute ${name}`),
  ]));
  const classNames = (input.classNames || []).map((value) => pattern(value, "class name"));
  return Object.freeze({
    tags,
    attributes: Object.freeze(attributes),
    classNames: Object.freeze(classNames),
    maxElements: Math.max(1, Math.min(Number(input.maxElements || 500), 10_000)),
    maxDepth: Math.max(1, Math.min(Number(input.maxDepth || 20), 100)),
    maxTextLength: Math.max(0, Math.min(Number(input.maxTextLength || 100_000), 1_000_000)),
  });
}

function assertAttribute(policy, name, value) {
  const rule = policy.attributes[name];
  if (!rule) throw new Error(`DOM shape rejected attribute: ${name}`);
  if (rule !== true && !rule.test(value)) throw new Error(`DOM shape rejected ${name}: ${value}`);
  if (name === "class") {
    for (const token of value.split(/\s+/).filter(Boolean)) {
      if (!policy.classNames.some((allowed) => allowed.test(token))) {
        throw new Error(`DOM shape rejected class: ${token}`);
      }
    }
  }
}

export function inspectDomShape(root, policyInput) {
  const policy = policyInput?.tags instanceof Set ? policyInput : compileDomShapePolicy(policyInput);
  const tags = {};
  let elements = 0;
  let textLength = 0;
  function visit(element, depth) {
    if (depth > policy.maxDepth) throw new Error(`DOM shape exceeds depth ${policy.maxDepth}`);
    const tag = String(element.localName || element.tagName || "").toLowerCase();
    if (!policy.tags.has(tag)) throw new Error(`DOM shape rejected element: ${tag}`);
    elements += 1;
    if (elements > policy.maxElements) throw new Error(`DOM shape exceeds ${policy.maxElements} elements`);
    tags[tag] = (tags[tag] || 0) + 1;
    for (const [name, value] of attributeEntries(element)) assertAttribute(policy, name, value);
    for (const child of Array.from(element.childNodes || [])) {
      if (child.nodeType === 3) textLength += String(child.textContent || "").length;
    }
    if (textLength > policy.maxTextLength) throw new Error(`DOM shape exceeds text limit ${policy.maxTextLength}`);
    for (const child of elementChildren(element)) visit(child, depth + 1);
  }
  for (const child of elementChildren(root)) visit(child, 1);
  return Object.freeze({ elements, textLength, tags: Object.freeze(tags) });
}

export class BrowserDomHost {
  constructor(root, policy, { onViolation = () => {} } = {}) {
    if (!root?.querySelectorAll) throw new Error("BrowserDomHost requires a browser root");
    this.root = root;
    this.policy = compileDomShapePolicy(policy);
    this.onViolation = onViolation;
    this.nodes = new Map([["root", root]]);
    this.ids = new WeakMap([[root, "root"]]);
    this.nextId = 1;
    this.observer = null;
  }

  register(node) {
    if (!this.root.contains(node) && node !== this.root) throw new Error("DOM handle is outside the granted root");
    let id = this.ids.get(node);
    if (!id) {
      id = String(this.nextId++);
      this.ids.set(node, id);
      this.nodes.set(id, node);
    }
    return id;
  }

  node(id) {
    const node = this.nodes.get(String(id));
    if (!node || (node !== this.root && !this.root.contains(node))) throw new Error("DOM handle is no longer available");
    return node;
  }

  inspect() {
    return inspectDomShape(this.root, this.policy);
  }

  query(selector, all = false) {
    if (typeof selector !== "string" || selector.length > 120 || /[,:+~[\]]/.test(selector)) {
      throw new Error("Selector is outside the browser-use subset");
    }
    const found = all ? Array.from(this.root.querySelectorAll(selector)) : [this.root.querySelector(selector)].filter(Boolean);
    return { ids: found.map((node) => this.register(node)) };
  }

  read(id, property) {
    const node = this.node(id);
    if (!["textContent", "value", "checked", "className", "tagName", "childElementCount"].includes(property)) {
      throw new Error(`DOM read is not allowed: ${property}`);
    }
    return { value: node[property] };
  }

  write(id, property, value) {
    const node = this.node(id);
    if (!["textContent", "value", "checked"].includes(property)) throw new Error(`DOM write is not allowed: ${property}`);
    node[property] = property === "checked" ? Boolean(value) : String(value);
    this.inspect();
    return {};
  }

  start() {
    this.inspect();
    if (typeof MutationObserver === "undefined") return;
    this.observer = new MutationObserver(() => {
      try {
        this.inspect();
      } catch (error) {
        this.stop();
        this.root.replaceChildren();
        this.onViolation(error);
      }
    });
    this.observer.observe(this.root, { subtree: true, childList: true, attributes: true, characterData: true });
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
  }

  dispatch(message) {
    switch (message.op) {
      case "query": return this.query(message.selector, Boolean(message.all));
      case "read": return this.read(message.id, message.property);
      case "write": return this.write(message.id, message.property, message.value);
      case "inspect": return this.inspect();
      default: throw new Error(`Unsupported browser DOM operation: ${message.op}`);
    }
  }
}
